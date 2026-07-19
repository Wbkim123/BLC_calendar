// src/App.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Login from './components/Login';
import Calendar from './components/Calendar';
import DailyView from './components/DailyView';
import ScheduleImportModal from './components/ScheduleImportModal';
import ScheduleNotificationModal, { PendingScheduleNotification } from './components/ScheduleNotificationModal';
import { DailySchedule, UserRole, TrainingEvent } from './types/schedule';
import { mockSchedules } from './data/mockData';
import { auth, db, firebaseDatabaseUrl } from './firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { createAdminSession, disableNotifications, listenForForegroundNotifications } from './notifications';

const LEGACY_06_26_START = '2026-04-20';
const LEGACY_06_26_END = '2026-05-15';
const LEGACY_06_26_CYCLE = '06-26';
const LOGIN_STORAGE_KEY = 'blc_calendar_login';
const DISPLAY_MODE_STORAGE_KEY = 'blc_calendar_display_mode';
const DATABASE_WRITE_TIMEOUT_MS = 15000;

export type DisplayMode = 'auto' | 'tv';

type LoginResult = {
  role: UserRole;
  studentCycleName?: string;
};

type SavedLogin = {
  code?: string;
  role?: UserRole;
};

type NotificationFocus = {
  date: string;
  targetId: string;
  changeType: string;
  previewText?: string;
  changedFields: string[];
};

type ForegroundNotification = NotificationFocus & {
  id: number;
};

const getNotificationFocusFromUrl = (): NotificationFocus | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const date = params.get('date');
  const targetId = params.get('highlight');
  if (!date || !targetId) return null;
  return {
    date,
    targetId,
    changeType: params.get('change') || 'Schedule updated',
    previewText: params.get('preview') || undefined,
    changedFields: (params.get('fields') || '').split(',').filter(Boolean)
  };
};

const getLocalTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
};

const getScheduleEndDateTime = (schedule?: DailySchedule | null) => {
  if (!schedule?.events?.length) return null;

  const latestEndTime = schedule.events.reduce<string | null>((latest, event) => {
    const [, rawEndTime] = event.time.split('-');
    const normalizedEndTime = rawEndTime?.trim().padStart(4, '0');
    if (!normalizedEndTime || !/^\d{4}$/.test(normalizedEndTime)) return latest;
    return !latest || normalizedEndTime > latest ? normalizedEndTime : latest;
  }, null);

  if (!latestEndTime) return null;

  const [year, month, day] = schedule.date.split('-').map(Number);
  if (!year || !month || !day) return null;

  const endDate = new Date(year, month - 1, day);
  endDate.setHours(
    Number(latestEndTime.slice(0, 2)),
    Number(latestEndTime.slice(2, 4)),
    0,
    0
  );
  return endDate;
};

const updateDatabaseValues = async (updates: Record<string, unknown>) => {
  if (!Capacitor.isNativePlatform()) {
    await update(ref(db), updates);
    return;
  }

  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), DATABASE_WRITE_TIMEOUT_MS);
  try {
    const restUpdates = Object.fromEntries(
      Object.entries(updates).map(([path, value]) => [path.replace(/^\/+/, ''), value])
    );
    const response = await fetch(`${firebaseDatabaseUrl}/.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(restUpdates),
      signal: abortController.signal
    });
    if (!response.ok) throw new Error(`Database update failed (${response.status})`);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const normalizeStudentCode = (cycleName: string) => cycleName.replace(/\D/g, '');

const truncateNotificationPreview = (value: string, maxLength = 90) => {
  const compact = value.replace(/\s+/g, ' ').trim();
  if (compact.length <= maxLength) return compact;
  return `${compact.slice(0, maxLength - 1)}…`;
};

const buildEventPreview = (event: TrainingEvent, fields: string[]) => {
  if (fields.length === 0) return truncateNotificationPreview(event.eventName || 'Event updated');

  const labels: Record<string, string> = {
    time: 'TIME',
    eventName: 'EVENT',
    location: 'LOC',
    uniform: 'UNI',
    highlighted: 'HIGHLIGHT'
  };
  const values: Record<string, string> = {
    time: event.time,
    eventName: event.eventName,
    location: event.location,
    uniform: event.uniform,
    highlighted: event.highlighted ? 'ON' : 'OFF'
  };

  return truncateNotificationPreview(
    fields.map(field => `${labels[field] || field}: ${values[field] || ''}`).join(' · ')
  );
};

function resolveLoginFromCode(code: string, schedules: DailySchedule[]): LoginResult | null {
  const normalizedCode = code.trim();
  if (normalizedCode === '9876') return { role: 'VIEWER' };

  const todayStr = getLocalTodayString();
  const matchingCycle = schedules.find(schedule => {
    const cycleName = (schedule.cycleName || '').trim();
    return cycleName && normalizeStudentCode(cycleName) === normalizedCode;
  })?.cycleName;

  if (!matchingCycle) return null;

  const cycleSchedules = schedules.filter(schedule => schedule.cycleName === matchingCycle);
  const cycleStart = cycleSchedules.reduce((earliest, schedule) => schedule.date < earliest ? schedule.date : earliest, cycleSchedules[0].date);
  const cycleEnd = cycleSchedules.reduce((latest, schedule) => schedule.date > latest ? schedule.date : latest, cycleSchedules[0].date);

  if (todayStr < cycleStart || todayStr > cycleEnd) return null;

  return { role: 'STUDENT', studentCycleName: matchingCycle };
}

function App() {
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window === 'undefined') return null;

    try {
      const saved = window.localStorage.getItem(LOGIN_STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved) as SavedLogin | null;
      if (parsed?.role === 'ADMIN') return 'ADMIN';
      if (!parsed?.code) return null;
      if (parsed.role === 'VIEWER') return parsed.role;
      return null;
    } catch {
      return null;
    }
  });
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [uniforms, setUniforms] = useState<string[]>([]);
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);
  const [studentCycleName, setStudentCycleName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingNotification, setPendingNotification] = useState<PendingScheduleNotification | null>(null);
  const [notificationFocus, setNotificationFocus] = useState<NotificationFocus | null>(getNotificationFocusFromUrl);
  const [foregroundNotification, setForegroundNotification] = useState<ForegroundNotification | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    return window.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY) === 'tv' ? 'tv' : 'auto';
  });
  const hasAutoSelectedTodayRef = useRef(false);

  const handleDisplayModeChange = (nextMode: DisplayMode) => {
    setDisplayMode(nextMode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, nextMode);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    listenForForegroundNotifications().then(listener => {
      unsubscribe = listener;
    }).catch(console.error);
    return () => unsubscribe?.();
  }, []);

  useEffect(() => {
    const handleForegroundNotification = (event: Event) => {
      const detail = (event as CustomEvent<NotificationFocus>).detail;
      if (!detail?.date || !detail.targetId) return;

      hasAutoSelectedTodayRef.current = true;
      setSelectedDateId(detail.date);
      setNotificationFocus(null);
      window.setTimeout(() => setNotificationFocus(detail), 0);
      setForegroundNotification({ ...detail, id: Date.now() });
    };

    window.addEventListener('blc-schedule-notification', handleForegroundNotification);
    return () => window.removeEventListener('blc-schedule-notification', handleForegroundNotification);
  }, []);

  useEffect(() => {
    if (!foregroundNotification) return;
    const clearTimer = window.setTimeout(() => setForegroundNotification(null), 8000);
    return () => window.clearTimeout(clearTimer);
  }, [foregroundNotification]);

  useEffect(() => {
    if (!notificationFocus || selectedDateId !== notificationFocus.date) return;
    const clearTimer = window.setTimeout(() => {
      setNotificationFocus(null);
      const url = new URL(window.location.href);
      ['highlight', 'change', 'fields'].forEach(key => url.searchParams.delete(key));
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }, 4500);
    return () => window.clearTimeout(clearTimer);
  }, [notificationFocus, selectedDateId]);

  // 1. Firebase에서 실시간 데이터 불러오기
  useEffect(() => {
    const schedulesRef = ref(db, 'schedules');
    const locationsRef = ref(db, 'locations');
    const uniformsRef = ref(db, 'uniforms');
    let receivedSchedules = false;
    const loadingTimeout = window.setTimeout(() => {
      if (receivedSchedules) return;
      setApiError('Unable to connect to the schedule database. Check your internet connection and try again.');
      setIsLoading(false);
    }, 15000);

    // Bootstrap through ordinary HTTPS because Firebase's realtime transport
    // can fail to establish inside an iOS WKWebView.
    const abortController = new AbortController();
    const fetchDatabaseValue = async (path: string) => {
      const response = await fetch(`${firebaseDatabaseUrl}/${path}.json`, {
        cache: 'no-store',
        signal: abortController.signal
      });
      if (!response.ok) throw new Error(`Database request failed (${response.status})`);
      return response.json();
    };

    Promise.all([
      fetchDatabaseValue('schedules'),
      fetchDatabaseValue('locations'),
      fetchDatabaseValue('uniforms')
    ]).then(([scheduleData, locationData, uniformData]) => {
      const rawSchedules = scheduleData
        ? (Array.isArray(scheduleData) ? scheduleData : Object.values(scheduleData))
        : mockSchedules;
      const initialSchedules = rawSchedules
        .filter((day): day is DailySchedule => Boolean(day && typeof day === 'object' && day.date))
        .map(day => ({
          ...day,
          notes: day.notes || '',
          notesHighlighted: Boolean(day.notesHighlighted),
          sglNotes: day.sglNotes || '',
          sglNotesHighlighted: Boolean(day.sglNotesHighlighted),
          events: (day.events || []).map((event: TrainingEvent) => ({
            ...event,
            highlighted: Boolean(event.highlighted)
          }))
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      receivedSchedules = true;
      window.clearTimeout(loadingTimeout);
      setSchedules(initialSchedules);
      setLocations(locationData
        ? (Array.isArray(locationData) ? locationData : Object.values(locationData)) as string[]
        : ['MPR', 'CR', 'DFC', 'AUD', 'ACA', 'FLD', 'HMP']);
      setUniforms(uniformData
        ? (Array.isArray(uniformData) ? uniformData : Object.values(uniformData)) as string[]
        : ['PT', 'ACU', 'ASU']);
      setApiError(null);
      setIsLoading(false);
    }).catch(error => {
      if (abortController.signal.aborted) return;
      console.error('Initial database HTTPS load failed:', error);
    });

    // 사이클 제목 감시
    // 스케줄 감시
    const unsubSchedules = onValue(schedulesRef, (snapshot) => {
      receivedSchedules = true;
      window.clearTimeout(loadingTimeout);
      setApiError(null);
      console.log("Schedules snapshot received:", snapshot.val());
      const data = snapshot.val();
      if (data) {
        // Firebase might return an object if keys are non-sequential, ensure it's an array
        let schedulesArray = Array.isArray(data) ? data : Object.values(data);
        
        let normalizedLegacyCycle = false;

        // Ensure every day has an events array (Firebase omits empty arrays)
        schedulesArray = schedulesArray.map(day => {
          const isLegacy0626Date = day.date >= LEGACY_06_26_START && day.date <= LEGACY_06_26_END;
          const missingCycleName = !day.cycleName || String(day.cycleName).trim() === '';

          if (isLegacy0626Date && missingCycleName) {
            normalizedLegacyCycle = true;
            return {
              ...day,
              cycleName: LEGACY_06_26_CYCLE,
              notes: day.notes || "",
              notesHighlighted: Boolean(day.notesHighlighted),
              sglNotes: day.sglNotes || "",
              sglNotesHighlighted: Boolean(day.sglNotesHighlighted),
              events: (day.events || []).map((event: TrainingEvent) => ({
                ...event,
                highlighted: Boolean(event.highlighted)
              }))
            };
          }

          return {
            ...day,
            notes: day.notes || "",
            notesHighlighted: Boolean(day.notesHighlighted),
            sglNotes: day.sglNotes || "",
            sglNotesHighlighted: Boolean(day.sglNotesHighlighted),
            events: (day.events || []).map((event: TrainingEvent) => ({
              ...event,
              highlighted: Boolean(event.highlighted)
            }))
          };
        });

        // Sort by date to ensure correct order
        schedulesArray.sort((a, b) => a.date.localeCompare(b.date));

        setSchedules(schedulesArray as DailySchedule[]);
        if (normalizedLegacyCycle) {
          set(schedulesRef, schedulesArray).catch(err => {
            console.error("Error normalizing 06-26 cycleName:", err);
          });
        }
        setIsLoading(false);
      } else {
        console.log("No schedules data, setting initial...");
        set(schedulesRef, mockSchedules)
          .then(() => setIsLoading(false))
          .catch(err => {
            console.error("Error setting initial schedules:", err);
            setApiError("Failed to initialize schedules: " + err.message);
            setIsLoading(false);
          });
      }
    }, (error) => {
      receivedSchedules = true;
      window.clearTimeout(loadingTimeout);
      console.error("Schedules sync error:", error);
      setApiError("Permission denied or database error: " + error.message);
      setIsLoading(false);
    });

    // 위치 데이터 감시
    const unsubLocations = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const locsArray = Array.isArray(data) ? data : Object.values(data);
        setLocations(locsArray as string[]);
      } else {
        const defaultLocs = ['MPR', 'CR', 'DFC', 'AUD', 'ACA', 'FLD', 'HMP'];
        set(locationsRef, defaultLocs).catch(err => console.error("Error setting locations:", err));
      }
    });

    // 복장 데이터 감시
    const unsubUniforms = onValue(uniformsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const unisArray = Array.isArray(data) ? data : Object.values(data);
        setUniforms(unisArray as string[]);
      } else {
        const defaultUnis = ['PT', 'ACU', 'ASU'];
        set(uniformsRef, defaultUnis).catch(err => console.error("Error setting uniforms:", err));
      }
    }, (error) => {
      console.error("Uniforms sync error:", error);
    });

    return () => {
      abortController.abort();
      window.clearTimeout(loadingTimeout);
      unsubSchedules();
      unsubLocations();
      unsubUniforms();
    };
  }, []);

  useEffect(() => {
    if (role || schedules.length === 0 || typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(LOGIN_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as SavedLogin | null;
      if (parsed?.role === 'ADMIN') return;
      if (!parsed?.code) return;

      const login = resolveLoginFromCode(parsed.code, schedules);
      if (!login?.role) {
        window.localStorage.removeItem(LOGIN_STORAGE_KEY);
        return;
      }

      setRole(login.role);
      setStudentCycleName(login.studentCycleName || null);
      hasAutoSelectedTodayRef.current = false;
    } catch {
      window.localStorage.removeItem(LOGIN_STORAGE_KEY);
    }
  }, [role, schedules]);

  // 로그인 시 오늘 날짜 자동 선택
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSetRole = (newRole: UserRole) => {
    setRole(newRole);
    hasAutoSelectedTodayRef.current = false;
    if (newRole) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      
      // schedules가 로딩된 후에만 체크 가능하지만, 이미 로딩된 상태일 가능성이 높음
      if (schedules.length > 0) {
        const hasSchedule = schedules.some(s => s.date === todayStr);
        if (hasSchedule) {
          hasAutoSelectedTodayRef.current = true;
          setSelectedDateId(todayStr);
        }
      }
    }
  };

  // 사이클 제목 수정 함수
  // 새로운 위치 추가 함수 (Firebase에 직접 반영)
  const addLocation = (loc: string) => {
    if (loc && !locations.includes(loc)) {
      set(ref(db, 'locations'), [...locations, loc]).catch(err => {
        alert("Failed to add location: " + err.message);
      });
    }
  };

  // 새로운 복장 추가 함수 (Firebase에 직접 반영)
  const addUniform = (uni: string) => {
    if (uni && !uniforms.includes(uni)) {
      set(ref(db, 'uniforms'), [...uniforms, uni]).catch(err => {
        alert("Failed to add uniform: " + err.message);
      });
    }
  };

  const queueScheduleNotification = (
    dateStr: string,
    changeType: string,
    targetId: string,
    changedFields: string[] = [],
    previewText?: string
  ) => {
    const changedDay = schedules.find(day => day.date === dateStr);
    setPendingNotification({
      date: dateStr,
      cycleName: changedDay?.cycleName || null,
      changeType,
      previewText,
      targetId,
      changedFields
    });
  };

  const updateScheduleLocally = (
    dateStr: string,
    updater: (schedule: DailySchedule) => DailySchedule
  ) => {
    setSchedules(current => current.map(schedule =>
      schedule.date === dateStr ? updater(schedule) : schedule
    ));
  };

  // 관리자가 이벤트를 수정했을 때 호출되는 함수 (Firebase 업데이트)
  const handleSaveEvent = (dateStr: string, updatedEvent: TrainingEvent) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const currentEvents = schedules[dayIndex].events || [];
      const eventIndex = currentEvents.findIndex(ev => ev.id === updatedEvent.id);
      if (eventIndex !== -1) {
        const originalEvent = currentEvents[eventIndex];
        const changedFields = (['time', 'eventName', 'location', 'uniform', 'highlighted'] as const)
          .filter(field => originalEvent[field] !== updatedEvent[field]);
        const updates: any = {};
        updates[`/schedules/${dayIndex}/events/${eventIndex}`] = updatedEvent;
        updateDatabaseValues(updates)
          .then(() => {
            updateScheduleLocally(dateStr, day => ({
              ...day,
              events: (day.events || []).map(event =>
                event.id === updatedEvent.id ? updatedEvent : event
              )
            }));
            queueScheduleNotification(
              dateStr,
              'Event updated',
              `event:${updatedEvent.id}`,
              changedFields,
              buildEventPreview(updatedEvent, changedFields)
            );
          })
          .catch(err => {
            alert("Failed to save changes: " + err.message);
          });
      }
    }
  };

  const handleSaveDayNotes = (dateStr: string, notes: string) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const updates: any = {};
      updates[`/schedules/${dayIndex}/notes`] = notes.trim();
      updateDatabaseValues(updates)
        .then(() => {
          updateScheduleLocally(dateStr, day => ({ ...day, notes: notes.trim() }));
          queueScheduleNotification(
            dateStr,
            'Notes updated',
            'notes',
            ['notes'],
            `NOTE: ${truncateNotificationPreview(notes.trim() || 'Notes cleared')}`
          );
        })
        .catch(err => {
          alert("Failed to save notes: " + err.message);
        });
    }
  };

  const handleToggleDayNotesHighlight = (dateStr: string) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const updates: any = {};
      updates[`/schedules/${dayIndex}/notesHighlighted`] = !schedules[dayIndex].notesHighlighted;
      updateDatabaseValues(updates)
        .then(() => {
          const highlighted = !schedules[dayIndex].notesHighlighted;
          updateScheduleLocally(dateStr, day => ({ ...day, notesHighlighted: highlighted }));
          queueScheduleNotification(
            dateStr,
            'Notes highlight changed',
            'notes',
            ['highlighted'],
            `NOTE HIGHLIGHT: ${highlighted ? 'ON' : 'OFF'}`
          );
        })
        .catch(err => {
          alert("Failed to highlight notes: " + err.message);
        });
    }
  };

  const handleSaveSglNotes = (dateStr: string, notes: string) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const updates: any = {};
      updates[`/schedules/${dayIndex}/sglNotes`] = notes.trim();
      updateDatabaseValues(updates)
        .then(() => {
          updateScheduleLocally(dateStr, day => ({ ...day, sglNotes: notes.trim() }));
          queueScheduleNotification(
            dateStr,
            'SGL notes updated',
            'sglNotes',
            ['sglNotes'],
            `SGL NOTE: ${truncateNotificationPreview(notes.trim() || 'SGL notes cleared')}`
          );
        })
        .catch(err => {
          alert("Failed to save SGL notes: " + err.message);
        });
    }
  };

  const handleToggleSglNotesHighlight = (dateStr: string) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const updates: any = {};
      updates[`/schedules/${dayIndex}/sglNotesHighlighted`] = !schedules[dayIndex].sglNotesHighlighted;
      updateDatabaseValues(updates)
        .then(() => {
          const highlighted = !schedules[dayIndex].sglNotesHighlighted;
          updateScheduleLocally(dateStr, day => ({ ...day, sglNotesHighlighted: highlighted }));
          queueScheduleNotification(
            dateStr,
            'SGL notes highlight changed',
            'sglNotes',
            ['highlighted'],
            `SGL NOTE HIGHLIGHT: ${highlighted ? 'ON' : 'OFF'}`
          );
        })
        .catch(err => {
          alert("Failed to highlight SGL notes: " + err.message);
        });
    }
  };

  // 새로운 이벤트 추가 함수
  const handleCreateEvent = (dateStr: string, newEvent: TrainingEvent) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const currentEvents = schedules[dayIndex].events || [];
      const updates: any = {};
      updates[`/schedules/${dayIndex}/events`] = [...currentEvents, newEvent];
      updateDatabaseValues(updates)
        .then(() => {
          updateScheduleLocally(dateStr, day => ({
            ...day,
            events: [...(day.events || []), newEvent]
          }));
          queueScheduleNotification(
            dateStr,
            'Event added',
            `event:${newEvent.id}`,
            ['eventName', 'time', 'location', 'uniform'],
            buildEventPreview(newEvent, ['time', 'eventName', 'location', 'uniform'])
          );
        })
        .catch(err => {
          alert("Failed to add event: " + err.message);
        });
    }
  };

  // 이벤트 삭제 함수
  const handleDeleteEvent = (dateStr: string, eventId: string) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    if (dayIndex !== -1) {
      const currentEvents = schedules[dayIndex].events || [];
      const updatedEvents = currentEvents.filter(ev => ev.id !== eventId);
      const updates: any = {};
      updates[`/schedules/${dayIndex}/events`] = updatedEvents;
      updateDatabaseValues(updates)
        .then(() => {
          const deletedEvent = currentEvents.find(ev => ev.id === eventId);
          updateScheduleLocally(dateStr, day => ({
            ...day,
            events: (day.events || []).filter(event => event.id !== eventId)
          }));
          queueScheduleNotification(
            dateStr,
            'Event deleted',
            'day',
            [],
            deletedEvent ? `DELETED: ${truncateNotificationPreview(deletedEvent.eventName)}` : 'Event deleted'
          );
        })
        .catch(err => {
          alert("Failed to delete event: " + err.message);
        });
    }
  };

  // 스케줄 대량 임포트 함수
  const handleImportSchedules = (newSchedules: DailySchedule[]) => {
    let updatedSchedules = [...schedules];
    
    newSchedules.forEach(newDay => {
      const existingIndex = updatedSchedules.findIndex(s => s.date === newDay.date);
      if (existingIndex !== -1) {
        updatedSchedules[existingIndex] = {
          ...updatedSchedules[existingIndex],
          notes: [updatedSchedules[existingIndex].notes, newDay.notes].filter(Boolean).join('\n'),
          notesHighlighted: Boolean(updatedSchedules[existingIndex].notesHighlighted || newDay.notesHighlighted),
          sglNotes: [updatedSchedules[existingIndex].sglNotes, newDay.sglNotes].filter(Boolean).join('\n'),
          sglNotesHighlighted: Boolean(updatedSchedules[existingIndex].sglNotesHighlighted || newDay.sglNotesHighlighted),
          events: [...(updatedSchedules[existingIndex].events || []), ...newDay.events]
        };
      } else {
        updatedSchedules.push(newDay);
      }
    });

    updatedSchedules.sort((a, b) => a.date.localeCompare(b.date));

    set(ref(db, 'schedules'), updatedSchedules).catch(err => {
      alert("Failed to import schedules: " + err.message);
    });
  };

  // 스케줄 초기화 함수 (전체 삭제)
  const handleResetSchedules = () => {
    if (window.confirm("Are you sure you want to CLEAR ALL schedules from the database?")) {
      remove(ref(db, 'schedules')).then(() => {
        setSchedules([]);
      }).catch(err => {
        alert("Failed to reset schedules: " + err.message);
      });
    }
  };

  // 특정 기수(Cycle) 삭제 함수
  const handleDeleteCycle = (targetCycle: string) => {
    if (window.confirm(`Are you sure you want to delete ALL schedules for cycle [${targetCycle}]?`)) {
      const updatedSchedules = schedules.filter(s => s.cycleName !== targetCycle);
      set(ref(db, 'schedules'), updatedSchedules).catch(err => {
        alert("Failed to delete cycle: " + err.message);
      });
    }
  };
  const handleLogout = () => {
    const previousRole = role;
    const previousStudentCycleName = studentCycleName;

    // Clear the local session first so slow notification/auth requests cannot
    // leave the user stuck on the calendar after pressing LOGOUT.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOGIN_STORAGE_KEY);
    }

    setRole(null);
    setSelectedDateId(null);
    setStudentCycleName(null);
    hasAutoSelectedTodayRef.current = false;

    void Promise.allSettled([
      disableNotifications(previousRole, previousStudentCycleName, false),
      signOut(auth)
    ]).then(results => {
      const [notificationResult, authResult] = results;
      if (notificationResult.status === 'rejected') {
        console.error('Failed to unsubscribe from schedule notifications:', notificationResult.reason);
      }
      if (authResult.status === 'rejected') {
        console.error('Failed to end administrator session:', authResult.reason);
      }
    });
  };
  const handleLogin = async (code: string, rememberLogin: boolean) => {
    let login = resolveLoginFromCode(code, schedules);

    if (!login?.role) {
      try {
        await createAdminSession(code.trim());
        login = { role: 'ADMIN' };
      } catch {
        return false;
      }
    }

    hasAutoSelectedTodayRef.current = false;
    setRole(login.role);
    setStudentCycleName(login.studentCycleName || null);

    if (typeof window !== 'undefined') {
      if (rememberLogin) {
        window.localStorage.setItem(
          LOGIN_STORAGE_KEY,
          JSON.stringify(login.role === 'ADMIN'
            ? { role: 'ADMIN' }
            : { code: code.trim(), role: login.role })
        );
      } else {
        window.localStorage.removeItem(LOGIN_STORAGE_KEY);
      }
    }

    return true;
  };

  const handleBackToCalendar = () => {
    hasAutoSelectedTodayRef.current = true;
    setSelectedDateId(null);
  };

  useEffect(() => {
    if (!role || selectedDateId || schedules.length === 0 || hasAutoSelectedTodayRef.current) return;

    const linkedDate = new URLSearchParams(window.location.search).get('date');
    const availableSchedules = role === 'STUDENT'
      ? schedules.filter(schedule => schedule.cycleName === studentCycleName)
      : schedules;

    if (linkedDate && availableSchedules.some(schedule => schedule.date === linkedDate)) {
      hasAutoSelectedTodayRef.current = true;
      setSelectedDateId(linkedDate);
      return;
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    if (schedules.some(s => s.date === todayStr)) {
      hasAutoSelectedTodayRef.current = true;
      setSelectedDateId(todayStr);
    }
  }, [role, schedules, selectedDateId, studentCycleName]);

  const activeCycleName = useMemo(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const cycleRanges = new Map<string, { start: string; end: string }>();

    schedules.forEach(schedule => {
      const cycleName = (schedule.cycleName || '').trim();
      if (!cycleName) return;

      const existing = cycleRanges.get(cycleName);
      if (!existing) {
        cycleRanges.set(cycleName, { start: schedule.date, end: schedule.date });
        return;
      }

      if (schedule.date < existing.start) existing.start = schedule.date;
      if (schedule.date > existing.end) existing.end = schedule.date;
    });

    const activeOrNextCycle = Array.from(cycleRanges.entries())
      .sort((a, b) => a[1].start.localeCompare(b[1].start))
      .find(([, range]) => range.end >= todayStr);

    return activeOrNextCycle ? activeOrNextCycle[0] : null;
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    if (role === 'STUDENT') {
      return schedules.filter(s => s.cycleName === studentCycleName);
    }
    return schedules;
  }, [role, schedules, studentCycleName]);

  useEffect(() => {
    if (!role || !selectedDateId || filteredSchedules.length === 0) return;

    const advanceScheduleIfNeeded = () => {
      if (displayMode !== 'tv') return;

      const todayStr = getLocalTodayString();

      if (selectedDateId < todayStr) {
        const nextSchedule = filteredSchedules.find(schedule => schedule.date >= todayStr);

        if (nextSchedule && nextSchedule.date !== selectedDateId) {
          hasAutoSelectedTodayRef.current = true;
          setSelectedDateId(nextSchedule.date);
        }
        return;
      }

      const currentSchedule = filteredSchedules.find(schedule => schedule.date === selectedDateId);
      const nextSchedule = filteredSchedules.find(schedule => schedule.date > selectedDateId);
      const currentScheduleEnd = getScheduleEndDateTime(currentSchedule);

      if (nextSchedule && currentScheduleEnd && Date.now() > currentScheduleEnd.getTime()) {
        hasAutoSelectedTodayRef.current = true;
        setSelectedDateId(nextSchedule.date);
      }
    };

    advanceScheduleIfNeeded();
    const intervalId = window.setInterval(advanceScheduleIfNeeded, 30000);
    return () => window.clearInterval(intervalId);
  }, [role, selectedDateId, filteredSchedules, displayMode]);

  const cycleTitle = useMemo(() => {
    const titleCycleName = role === 'STUDENT' ? studentCycleName : activeCycleName;
    return titleCycleName ? `BLC CLASS ${titleCycleName}` : 'BLC CLASS';
  }, [role, studentCycleName, activeCycleName]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-blue-900 text-white font-bold">
        Loading Data...
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-900 text-white p-6 text-center">
        <h1 className="text-2xl font-bold mb-4">API Connection Error</h1>
        <p className="mb-6">{apiError}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-white text-red-900 px-6 py-2 rounded-lg font-bold"
        >
          RETRY
        </button>
      </div>
    );
  }

  if (!role) {
    return <Login onLogin={handleLogin} />;
  }

  const foregroundNotificationToast = foregroundNotification ? (
    <button
      type="button"
      onClick={() => {
        hasAutoSelectedTodayRef.current = true;
        setSelectedDateId(foregroundNotification.date);
        setNotificationFocus(null);
        window.setTimeout(() => {
          setNotificationFocus({
            date: foregroundNotification.date,
            targetId: foregroundNotification.targetId,
            changeType: foregroundNotification.changeType,
            previewText: foregroundNotification.previewText,
            changedFields: foregroundNotification.changedFields
          });
        }, 0);
        setForegroundNotification(null);
      }}
      className="fixed left-3 right-3 top-3 z-[80] rounded-2xl border-2 border-blue-300 bg-white p-4 text-left shadow-2xl ring-4 ring-blue-100 sm:left-auto sm:right-4 sm:w-96"
    >
      <div className="text-[10px] font-black uppercase tracking-widest text-blue-600">
        Schedule notification received
      </div>
      <div className="mt-1 text-sm font-black text-gray-900">
        {foregroundNotification.previewText || foregroundNotification.changeType || 'Schedule updated'}
      </div>
      <div className="mt-1 text-xs font-bold text-gray-500">
        {foregroundNotification.date} · Tap to view highlighted change
      </div>
    </button>
  ) : null;

  const selectedSchedule = filteredSchedules.find(s => s.date === selectedDateId);

  if (selectedSchedule) {
    const currentIndex = filteredSchedules.findIndex(s => s.date === selectedDateId);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < filteredSchedules.length - 1;

    const handlePrev = hasPrev ? () => setSelectedDateId(filteredSchedules[currentIndex - 1].date) : undefined;
    const handleNext = hasNext ? () => setSelectedDateId(filteredSchedules[currentIndex + 1].date) : undefined;

    return (
      <>
      {foregroundNotificationToast}
      <DailyView 
        schedule={selectedSchedule} 
        role={role}
        onBack={handleBackToCalendar}
        onSave={handleSaveEvent}
        onSaveNotes={handleSaveDayNotes}
        onToggleNotesHighlight={handleToggleDayNotesHighlight}
        onSaveSglNotes={handleSaveSglNotes}
        onToggleSglNotesHighlight={handleToggleSglNotesHighlight}
        onCreateEvent={handleCreateEvent}
        onDeleteEvent={handleDeleteEvent}
        locations={locations}
        uniforms={uniforms}
        onAddLocation={addLocation}
        onAddUniform={addUniform}
        onPrev={handlePrev}
        onNext={handleNext}
        notificationHighlightTarget={notificationFocus?.targetId || null}
        notificationChangeType={notificationFocus?.previewText || notificationFocus?.changeType || null}
        notificationChangedFields={notificationFocus?.changedFields || []}
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
      />
      {pendingNotification && (
        <ScheduleNotificationModal
          change={pendingNotification}
          onClose={() => setPendingNotification(null)}
        />
      )}
      </>
    );
  }

  return (
    <>
      {foregroundNotificationToast}
      <Calendar 
        schedules={filteredSchedules} 
        onSelectDate={(date) => setSelectedDateId(date)} 
        role={role}
        onLogout={handleLogout}
        cycleTitle={cycleTitle}
        onOpenImport={() => setIsImportModalOpen(true)}
        onResetSchedules={handleResetSchedules}
        onDeleteCycle={handleDeleteCycle}
        showAdBanner={!isImportModalOpen}
        displayMode={displayMode}
        onDisplayModeChange={handleDisplayModeChange}
      />
      {isImportModalOpen && (
        <ScheduleImportModal 
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportSchedules}
          locations={locations}
          uniforms={uniforms}
        />
      )}
    </>
  );
}

export default App;
