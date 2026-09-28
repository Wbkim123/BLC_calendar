import { isStagingSession, selectStagingSession, stagingDatabaseUrl, getSessionGeneration, stagingAuth } from './staging';
import { canUseWebsite } from './features/auth/webAccess';
import { chooseAutoTvSchedule, chooseTvSchedule } from './features/tv/tvSchedules';
import TvScheduleControls from './features/tv/TvScheduleControls';
// src/App.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import Login from './components/Login';
import Calendar from './components/Calendar';
import DailyView from './components/DailyView';
import AcademyScheduleImportModal from './features/schedule-import/AcademyScheduleImportModal';
import AcademySwitcher from './shared/components/AcademySwitcher';
import ScheduleNotificationModal, { PendingScheduleNotification } from './components/ScheduleNotificationModal';
import GeneralSettings from './components/GeneralSettings';
import NotificationPrompt from './components/NotificationPrompt';
import { DailySchedule, UserRole, TrainingEvent } from './types/schedule';
import { AccessProfile, AcademyId } from './types/academy';
import { getAcademyConfig } from './config/academies';
import { normalizeAccessCode, resolveAccessCode } from './features/auth/accessCodes';
import { assertTestSessionWriteAllowed } from './features/auth/testModePolicy';
import { EventSearchResult } from './features/event-search/searchEvents';
import NcoaChatbot from './features/chatbot/NcoaChatbot';
import {
  prepareStudentInterstitial,
  recordStudentCalendarReturnAndMaybeShow
} from './features/ads/studentInterstitial';
import { mockSchedules } from './data/mockData';
import { auth, db, getDatabaseRestUrl, useFirebaseEmulators } from './firebase';
import { ref, onValue, set, update, remove } from 'firebase/database';
import { signInAnonymously, signOut } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import {
  clearAdminSessionToken,
  createAdminSession,
  prepareNotificationEnvironment,
  disableNotifications,
  getAdminIdToken,
  isPhoneDevice,
  listenForForegroundNotifications
} from './notifications';

const LEGACY_06_26_START = '2026-04-20';
const LEGACY_06_26_END = '2026-05-15';
const LEGACY_06_26_CYCLE = '06-26';
const LOGIN_STORAGE_KEY = 'blc_calendar_login';
const DISPLAY_MODE_STORAGE_KEY = 'blc_calendar_display_mode';
const DARK_MODE_STORAGE_KEY = 'blc_calendar_dark_mode';
const DATABASE_WRITE_TIMEOUT_MS = 15000;

export type DisplayMode = 'auto' | 'tv';

type SavedLogin = {
  code?: string;
  role?: UserRole;
  testMode?: boolean;
  profile?: AccessProfile;
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

const getLocalTodayString = (today = new Date()) => {
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

const requestNativeDatabaseWrite = async (
  path: string,
  method: 'PATCH' | 'PUT' | 'DELETE',
  value?: unknown
) => {
  const staging = isStagingSession();
  const generation = getSessionGeneration();
  const idToken = await getAdminIdToken();
  if (generation !== getSessionGeneration()) throw new Error('Session changed.');
  if (!idToken) throw new Error('Administrator authentication is required. Log out and sign in again.');
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), DATABASE_WRITE_TIMEOUT_MS);
  try {
    const normalizedPath = path.replace(/^\/+|\/+$/g, '');
    const response = await fetch(staging ? stagingDatabaseUrl(normalizedPath, idToken) : getDatabaseRestUrl(normalizedPath, idToken), {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: method === 'DELETE' ? undefined : JSON.stringify(value),
      signal: abortController.signal
    });
    if (generation !== getSessionGeneration()) throw new Error('Session changed.');
    if (response.ok && staging) window.dispatchEvent(new Event('staging-data-changed'));
    if (!response.ok) {
      const responseError = await response.json().catch(() => null) as { error?: string } | null;
      throw new Error(responseError?.error || `Database update failed (${response.status})`);
    }
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const updateDatabaseValues = async (updates: Record<string, unknown>, readOnlyTestSession = false) => {
  assertTestSessionWriteAllowed(readOnlyTestSession, isStagingSession());
  if (!Capacitor.isNativePlatform() && !isStagingSession()) {
    await update(ref(db), updates);
    return;
  }

  const restUpdates = Object.fromEntries(
    Object.entries(updates).map(([path, value]) => [path.replace(/^\/+/, ''), value])
  );
  await requestNativeDatabaseWrite('', 'PATCH', restUpdates);
};

const setDatabaseValue = async (path: string, value: unknown, readOnlyTestSession = false) => {
  assertTestSessionWriteAllowed(readOnlyTestSession, isStagingSession());
  if (Capacitor.isNativePlatform() || isStagingSession()) {
    await requestNativeDatabaseWrite(path, 'PUT', value);
    return;
  }
  await set(ref(db, path), value);
};

const removeDatabaseValue = async (path: string, readOnlyTestSession = false) => {
  assertTestSessionWriteAllowed(readOnlyTestSession, isStagingSession());
  if (Capacitor.isNativePlatform() || isStagingSession()) {
    await requestNativeDatabaseWrite(path, 'DELETE');
    return;
  }
  await remove(ref(db, path));
};

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

function App() {
  const getSavedProfile = (): AccessProfile | null => {
    if (typeof window === 'undefined') return null;
    try {
      const parsed = JSON.parse(window.localStorage.getItem(LOGIN_STORAGE_KEY) || 'null') as SavedLogin | null;
      const profile = parsed?.profile || null;
      if (!Capacitor.isNativePlatform() && parsed?.testMode !== true && !canUseWebsite(profile)) return null;
      return profile;
    } catch {
      return null;
    }
  };
  const [accessProfile, setAccessProfile] = useState<AccessProfile | null>(getSavedProfile);
  const [academy, setAcademy] = useState<AcademyId>(() => getSavedProfile()?.academy || 'BLC');
  const [role, setRole] = useState<UserRole>(() => {
    if (typeof window === 'undefined') return null;

    try {
      const saved = window.localStorage.getItem(LOGIN_STORAGE_KEY);
      if (!saved) return null;

      const parsed = JSON.parse(saved) as SavedLogin | null;
      if (!Capacitor.isNativePlatform()) return getSavedProfile()?.role || null;
      if (parsed?.profile?.role) return parsed.profile.role;
      if (parsed?.role === 'ADMIN') return 'ADMIN';
      if (!parsed?.code) return null;
      if (parsed.role === 'VIEWER') return parsed.role;
      return null;
    } catch {
      return null;
    }
  });
  const [isTestMode, setIsTestMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = JSON.parse(window.localStorage.getItem(LOGIN_STORAGE_KEY) || 'null') as SavedLogin | null;
      return saved?.role === 'ADMIN' && saved.testMode === true;
    } catch {
      return false;
    }
  });
  const [schedules, setSchedules] = useState<DailySchedule[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [uniforms, setUniforms] = useState<string[]>([]);
  const [selectedDateId, setSelectedDateId] = useState<string | null>(null);
  const [tvCycle, setTvCycle] = useState<string | null>(null);
  const [tvNow, setTvNow] = useState(Date.now);
  const isTvDisplay = accessProfile?.accessLevel === 'TV_DISPLAY';

  useEffect(() => {
    if (!isTvDisplay) return;
    const refresh = () => setTvNow(Date.now());
    refresh();
    const timer = window.setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [isTvDisplay]);
  const [studentCycleName, setStudentCycleName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pendingNotification, setPendingNotification] = useState<PendingScheduleNotification | null>(null);
  const [notificationFocus, setNotificationFocus] = useState<NotificationFocus | null>(getNotificationFocusFromUrl);
  const [foregroundNotification, setForegroundNotification] = useState<ForegroundNotification | null>(null);
  const [isTrackingAuthorizationResolved, setIsTrackingAuthorizationResolved] = useState(
    () => Capacitor.getPlatform() !== 'ios'
  );
  const [notificationOnboardingComplete, setNotificationOnboardingComplete] = useState(false);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => {
    if (typeof window === 'undefined') return 'auto';
    try {
      const saved = JSON.parse(window.localStorage.getItem(LOGIN_STORAGE_KEY) || 'null') as SavedLogin | null;
      if (saved?.testMode) return 'auto';
    } catch {
      // Fall back to the saved display preference if the login state is invalid.
    }
    return window.localStorage.getItem(DISPLAY_MODE_STORAGE_KEY) === 'tv' ? 'tv' : 'auto';
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(DARK_MODE_STORAGE_KEY) === 'true';
  });
  const hasAutoSelectedTodayRef = useRef(false);
  const logoutCleanupRef = useRef<Promise<unknown>>(Promise.resolve());
  const scheduleDatabaseKeyByDateRef = useRef<Map<string, string>>(new Map());

  const normalizeScheduleEvents = (events: TrainingEvent[] | Record<string, TrainingEvent> | undefined) => {
    const values = Array.isArray(events) ? events : Object.values(events || {});
    const seenIds = new Set<string>();
    return values.filter(event => {
      if (!event?.id || seenIds.has(event.id)) return false;
      seenIds.add(event.id);
      return true;
    }).map(event => ({ ...event, highlighted: Boolean(event.highlighted) }));
  };

  const getScheduleDatabaseKey = (dateStr: string) =>
    scheduleDatabaseKeyByDateRef.current.get(dateStr);
  // Academy paths are identical in shape, but staging uses a separate project.
  const getDatabasePath = (path: string) =>
    `${getAcademyConfig(academy).databasePrefix}${path.replace(/^\/+/, '')}`;
  const getScheduleUpdatePath = (path: string) =>
    `/${getDatabasePath(path.replace(/^\/+/, ''))}`;

  const handleDisplayModeChange = (nextMode: DisplayMode) => {
    if (isTvDisplay || isTestMode) return;
    setDisplayMode(nextMode);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, nextMode);
    }
  };

  const handleDarkModeChange = (enabled: boolean) => {
    setDarkMode(enabled);
    window.localStorage.setItem(DARK_MODE_STORAGE_KEY, String(enabled));
  };

  useEffect(() => {
    document.documentElement.classList.toggle('theme-dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    // TV profiles always use the TV layout; other profiles keep their preference.
    if (isTvDisplay && displayMode !== 'tv') {
      setDisplayMode('tv');
    }
  }, [isTvDisplay, displayMode]);

  useEffect(() => {
    const handleTrackingAuthorizationResolved = () => setIsTrackingAuthorizationResolved(true);
    window.addEventListener('blc-att-resolved', handleTrackingAuthorizationResolved);
    return () => window.removeEventListener('blc-att-resolved', handleTrackingAuthorizationResolved);
  }, []);

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
    const academyConfig = getAcademyConfig(academy);
    if (isTestMode) {
      setSchedules([]);
      setLocations([]);
      setUniforms([]);
      setIsLoading(true);
      scheduleDatabaseKeyByDateRef.current.clear();
      let controller = new AbortController();
      let disposed = false;
      let loading = false;
      const load = async () => {
        if (loading || disposed) return;
        controller = new AbortController();
        loading = true;
        const timeout = window.setTimeout(() => controller.abort(), 15000);
        try {
          if (!isStagingSession()) throw new Error('Staging session required.');
          const token = await getAdminIdToken();
          if (!token) throw new Error('Sign out and sign in to the test environment again.');
          const values = await Promise.all(['schedules', 'locations', 'uniforms'].map(async name => {
            const response = await fetch(stagingDatabaseUrl(`${academyConfig.databasePrefix}${name}`, token), {
              cache: 'no-store', signal: controller.signal
            });
            if (!response.ok) throw new Error(`Test database request failed (${response.status}).`);
            return response.json();
          }));
          if (controller.signal.aborted) return;
          const entries = Object.entries((values[0] || {}) as Record<string, DailySchedule>)
            .filter(([, day]) => Boolean(day?.date));
          scheduleDatabaseKeyByDateRef.current = new Map(entries.map(([key, day]) => [day.date, key]));
          setSchedules(entries.map(([, day]) => ({ ...day, events: normalizeScheduleEvents(day.events) }))
            .sort((a, b) => a.date.localeCompare(b.date)));
          setLocations(values[1] ? Object.values(values[1]) as string[] : academyConfig.defaultLocations);
          setUniforms(values[2] ? Object.values(values[2]) as string[] : academyConfig.defaultUniforms);
          setApiError(null);
        } catch {
          if (!disposed) setApiError('Cannot load the test database. Check the staging deployment or sign in again.');
        } finally {
          window.clearTimeout(timeout);
          loading = false;
          if (!disposed) setIsLoading(false);
        }
      };
      void load();
      const timer = window.setInterval(() => void load(), 5000);
      const refresh = () => { void load(); };
      window.addEventListener('staging-data-changed', refresh);
      return () => { disposed = true; controller.abort(); window.clearInterval(timer); window.removeEventListener('staging-data-changed', refresh); };
    }
    const databasePrefix = academyConfig.databasePrefix;
    const schedulesPath = `${databasePrefix}schedules`;
    const locationsPath = `${databasePrefix}locations`;
    const uniformsPath = `${databasePrefix}uniforms`;
    const schedulesRef = ref(db, schedulesPath);
    const locationsRef = ref(db, locationsPath);
    const uniformsRef = ref(db, uniformsPath);
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
      const response = await fetch(getDatabaseRestUrl(path), {
        cache: 'no-store',
        signal: abortController.signal
      });
      if (!response.ok) throw new Error(`Database request failed (${response.status})`);
      return response.json();
    };

    Promise.all([
      fetchDatabaseValue(schedulesPath),
      fetchDatabaseValue(locationsPath),
      fetchDatabaseValue(uniformsPath)
    ]).then(([scheduleData, locationData, uniformData]) => {
      if (abortController.signal.aborted) return;
      const rawEntries = scheduleData && typeof scheduleData === 'object'
        ? Object.entries(scheduleData as Record<string, DailySchedule>)
        : academy === 'BLC' && useFirebaseEmulators
          ? mockSchedules.map((schedule, index) => [String(index), schedule] as const)
          : [];
      scheduleDatabaseKeyByDateRef.current = new Map(
        rawEntries
          .filter((entry): entry is [string, DailySchedule] => Boolean(entry[1]?.date))
          .map(([key, day]) => [day.date, key])
      );
      const rawSchedules = rawEntries.map(([, day]) => day);
      const initialSchedules = rawSchedules
        .filter((day): day is DailySchedule => Boolean(day && typeof day === 'object' && day.date))
        .map(day => ({
          ...day,
          notes: day.notes || '',
          notesHighlighted: Boolean(day.notesHighlighted),
          sglNotes: day.sglNotes || '',
          sglNotesHighlighted: Boolean(day.sglNotesHighlighted),
          events: normalizeScheduleEvents(day.events)
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      receivedSchedules = true;
      window.clearTimeout(loadingTimeout);
      setSchedules(initialSchedules);
      setLocations(locationData
        ? (Array.isArray(locationData) ? locationData : Object.values(locationData)) as string[]
        : academyConfig.defaultLocations);
      setUniforms(uniformData
        ? (Array.isArray(uniformData) ? uniformData : Object.values(uniformData)) as string[]
        : academyConfig.defaultUniforms);
      setApiError(null);
      setIsLoading(false);
    }).catch(error => {
      if (abortController.signal.aborted) return;
      console.error('Initial database HTTPS load failed:', error);
      if (academy === 'KTA') {
        receivedSchedules = true;
        window.clearTimeout(loadingTimeout);
        setSchedules([]);
        setLocations(academyConfig.defaultLocations);
        setUniforms(academyConfig.defaultUniforms);
        setApiError(null);
        setIsLoading(false);
      }
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
        const scheduleEntries = Object.entries(data as Record<string, DailySchedule>);
        scheduleDatabaseKeyByDateRef.current = new Map(
          scheduleEntries
            .filter((entry): entry is [string, DailySchedule] => Boolean(entry[1]?.date))
            .map(([key, day]) => [day.date, key])
        );
        let schedulesArray = scheduleEntries.map(([, day]) => day);
        
        let normalizedLegacyCycle = false;

        // Ensure every day has an events array (Firebase omits empty arrays)
        schedulesArray = schedulesArray.map(day => {
          const isLegacy0626Date = academy === 'BLC' && day.date >= LEGACY_06_26_START && day.date <= LEGACY_06_26_END;
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
              events: normalizeScheduleEvents(day.events)
            };
          }

          return {
            ...day,
            notes: day.notes || "",
            notesHighlighted: Boolean(day.notesHighlighted),
            sglNotes: day.sglNotes || "",
            sglNotesHighlighted: Boolean(day.sglNotesHighlighted),
            events: normalizeScheduleEvents(day.events)
          };
        });

        // Sort by date to ensure correct order
        schedulesArray.sort((a, b) => a.date.localeCompare(b.date));

        setSchedules(schedulesArray as DailySchedule[]);
        if (normalizedLegacyCycle && useFirebaseEmulators) {
          set(schedulesRef, schedulesArray).catch(err => {
            console.error("Error normalizing 06-26 cycleName:", err);
          });
        }
        setIsLoading(false);
      } else {
        console.log("No schedules data, setting initial...");
        if (useFirebaseEmulators && academy === 'BLC') {
          set(schedulesRef, mockSchedules)
            .then(() => setIsLoading(false))
            .catch(err => {
              console.error("Error setting initial schedules:", err);
              setApiError("Failed to initialize schedules: " + err.message);
              setIsLoading(false);
            });
        } else {
          setSchedules([]);
          setIsLoading(false);
        }
      }
    }, (error) => {
      receivedSchedules = true;
      window.clearTimeout(loadingTimeout);
      console.error("Schedules sync error:", error);
      if (academy === 'KTA') {
        setSchedules([]);
        setLocations(academyConfig.defaultLocations);
        setUniforms(academyConfig.defaultUniforms);
        setApiError(null);
      } else {
        setApiError("Permission denied or database error: " + error.message);
      }
      setIsLoading(false);
    });

    // 위치 데이터 감시
    const unsubLocations = onValue(locationsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const locsArray = Array.isArray(data) ? data : Object.values(data);
        setLocations(locsArray as string[]);
      } else {
        setLocations(academyConfig.defaultLocations);
      }
    });

    // 복장 데이터 감시
    const unsubUniforms = onValue(uniformsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const unisArray = Array.isArray(data) ? data : Object.values(data);
        setUniforms(unisArray as string[]);
      } else {
        setUniforms(academyConfig.defaultUniforms);
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
  }, [isTestMode, academy]);

  useEffect(() => {
    if (role || schedules.length === 0 || typeof window === 'undefined') return;

    try {
      const saved = window.localStorage.getItem(LOGIN_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as SavedLogin | null;
      if (!Capacitor.isNativePlatform() && parsed?.testMode !== true && !canUseWebsite(parsed?.profile || null)) {
        window.localStorage.removeItem(LOGIN_STORAGE_KEY);
        return;
      }
      if (parsed?.role === 'ADMIN') return;
      if (!parsed?.code) return;

      const login = resolveAccessCode(parsed.code, schedules, academy);
      if (!login?.role || (!Capacitor.isNativePlatform() && !canUseWebsite(login))) {
        window.localStorage.removeItem(LOGIN_STORAGE_KEY);
        return;
      }

      setRole(login.role);
      setAccessProfile(login);
      setAcademy(login.academy);
      setStudentCycleName(login.studentCycleName || null);
      hasAutoSelectedTodayRef.current = false;
    } catch {
      window.localStorage.removeItem(LOGIN_STORAGE_KEY);
    }
  }, [role, schedules, academy]);

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
      setDatabaseValue(getDatabasePath('locations'), [...locations, loc], isTestMode).catch(err => {
        alert("Failed to add location: " + err.message);
      });
    }
  };

  // 새로운 복장 추가 함수 (Firebase에 직접 반영)
  const addUniform = (uni: string) => {
    if (uni && !uniforms.includes(uni)) {
      setDatabaseValue(getDatabasePath('uniforms'), [...uniforms, uni], isTestMode).catch(err => {
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
    const dayKey = getScheduleDatabaseKey(dateStr);
    if (dayIndex !== -1 && dayKey !== undefined) {
      const currentEvents = schedules[dayIndex].events || [];
      const eventIndex = currentEvents.findIndex(ev => ev.id === updatedEvent.id);
      if (eventIndex !== -1) {
        const originalEvent = currentEvents[eventIndex];
        const changedFields = (['time', 'eventName', 'location', 'uniform', 'highlighted'] as const)
          .filter(field => originalEvent[field] !== updatedEvent[field]);
        const updates: any = {};
        updates[getScheduleUpdatePath(`schedules/${dayKey}/events/${eventIndex}`)] = updatedEvent;
        updateDatabaseValues(updates, isTestMode)
          .then(() => {
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
    const dayKey = getScheduleDatabaseKey(dateStr);
    if (dayIndex !== -1 && dayKey !== undefined) {
      const updates: any = {};
      updates[getScheduleUpdatePath(`schedules/${dayKey}/notes`)] = notes.trim();
      updateDatabaseValues(updates, isTestMode)
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

  const handleSaveDayLabel = (dateStr: string, dayLabel: string) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    const dayKey = getScheduleDatabaseKey(dateStr);
    const normalizedLabel = dayLabel.trim().replace(/\s+/g, ' ').toUpperCase();
    if (dayIndex === -1 || dayKey === undefined || !normalizedLabel) return;

    const updates: any = {};
    updates[getScheduleUpdatePath(`schedules/${dayKey}/dayLabel`)] = normalizedLabel;
    updateDatabaseValues(updates, isTestMode)
      .then(() => {
        updateScheduleLocally(dateStr, day => ({ ...day, dayLabel: normalizedLabel }));
        queueScheduleNotification(dateStr, 'Day number updated', 'day', ['dayLabel'], `DAY LABEL: ${normalizedLabel}`);
      })
      .catch(err => alert("Failed to update day number: " + err.message));
  };

  const handleToggleDayNotesHighlight = (dateStr: string) => {
    const dayIndex = schedules.findIndex(day => day.date === dateStr);
    const dayKey = getScheduleDatabaseKey(dateStr);
    if (dayIndex !== -1 && dayKey !== undefined) {
      const updates: any = {};
      updates[getScheduleUpdatePath(`schedules/${dayKey}/notesHighlighted`)] = !schedules[dayIndex].notesHighlighted;
      updateDatabaseValues(updates, isTestMode)
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
    const dayKey = getScheduleDatabaseKey(dateStr);
    if (dayIndex !== -1 && dayKey !== undefined) {
      const updates: any = {};
      updates[getScheduleUpdatePath(`schedules/${dayKey}/sglNotes`)] = notes.trim();
      updateDatabaseValues(updates, isTestMode)
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
    const dayKey = getScheduleDatabaseKey(dateStr);
    if (dayIndex !== -1 && dayKey !== undefined) {
      const updates: any = {};
      updates[getScheduleUpdatePath(`schedules/${dayKey}/sglNotesHighlighted`)] = !schedules[dayIndex].sglNotesHighlighted;
      updateDatabaseValues(updates, isTestMode)
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
    const dayKey = getScheduleDatabaseKey(dateStr);
    if (dayIndex !== -1 && dayKey !== undefined) {
      const currentEvents = schedules[dayIndex].events || [];
      const updates: any = {};
      updates[getScheduleUpdatePath(`schedules/${dayKey}/events`)] = [...currentEvents, newEvent];
      updateDatabaseValues(updates, isTestMode)
        .then(() => {
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
    const dayKey = getScheduleDatabaseKey(dateStr);
    if (dayIndex !== -1 && dayKey !== undefined) {
      const currentEvents = schedules[dayIndex].events || [];
      const updatedEvents = currentEvents.filter(ev => ev.id !== eventId);
      const updates: any = {};
      updates[getScheduleUpdatePath(`schedules/${dayKey}/events`)] = updatedEvents;
      updateDatabaseValues(updates, isTestMode)
        .then(() => {
          const deletedEvent = currentEvents.find(ev => ev.id === eventId);
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
        if (newDay.academy === 'KTA') {
          // A corrected KTA PDF import must replace the previously parsed day.
          // Appending kept stale parser results (such as ROOM CHECK-only duty)
          // alongside the corrected merged ALL HANDS events.
          updatedSchedules[existingIndex] = {
            ...updatedSchedules[existingIndex],
            ...newDay,
            notes: newDay.notes || updatedSchedules[existingIndex].notes,
            notesHighlighted: Boolean(newDay.notesHighlighted || updatedSchedules[existingIndex].notesHighlighted),
            events: newDay.events
          };
        } else {
          updatedSchedules[existingIndex] = {
            ...updatedSchedules[existingIndex],
            notes: [updatedSchedules[existingIndex].notes, newDay.notes].filter(Boolean).join('\n'),
            notesHighlighted: Boolean(updatedSchedules[existingIndex].notesHighlighted || newDay.notesHighlighted),
            sglNotes: [updatedSchedules[existingIndex].sglNotes, newDay.sglNotes].filter(Boolean).join('\n'),
            sglNotesHighlighted: Boolean(updatedSchedules[existingIndex].sglNotesHighlighted || newDay.sglNotesHighlighted),
            events: [...(updatedSchedules[existingIndex].events || []), ...newDay.events]
          };
        }
      } else {
        updatedSchedules.push(newDay);
      }
    });

    updatedSchedules.sort((a, b) => a.date.localeCompare(b.date));

    setDatabaseValue(getDatabasePath('schedules'), updatedSchedules, isTestMode)
      .then(() => setSchedules(updatedSchedules))
      .catch(err => {
        alert("Failed to import schedules: " + err.message);
      });
  };

  // 스케줄 초기화 함수 (전체 삭제)
  const handleResetSchedules = () => {
    if (window.confirm("Are you sure you want to CLEAR ALL schedules from the database?")) {
      removeDatabaseValue(getDatabasePath('schedules'), isTestMode).then(() => {
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
      setDatabaseValue(getDatabasePath('schedules'), updatedSchedules, isTestMode)
        .then(() => setSchedules(updatedSchedules))
        .catch(err => {
          alert("Failed to delete cycle: " + err.message);
        });
    }
  };
  const handleLogout = () => {
    const cleanup = disableNotifications(role, studentCycleName, false, !isTestMode, academy);

    // Clear the local session first so slow notification/auth requests cannot
    // leave the user stuck on the calendar after pressing LOGOUT.
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LOGIN_STORAGE_KEY);
      clearAdminSessionToken();
      window.dispatchEvent(new Event('ncoa-test-session-changed'));
    }

    selectStagingSession(false);
    setSchedules([]);
    setLocations([]);
    setUniforms([]);
    setPendingNotification(null);
    setForegroundNotification(null);
    setNotificationFocus(null);
    setNotificationOnboardingComplete(false);
    setRole(null);
    setTvCycle(null);
    setAccessProfile(null);
    setIsTestMode(false);
    setSelectedDateId(null);
    setStudentCycleName(null);
    hasAutoSelectedTodayRef.current = false;

    logoutCleanupRef.current = Promise.allSettled([
      cleanup,
      signOut(auth),
      signOut(stagingAuth)
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
    await logoutCleanupRef.current;
    if (useFirebaseEmulators) {
      await signInAnonymously(auth);
      const emulatorProfile: AccessProfile = {
        role: 'ADMIN', accessLevel: 'NCOA_MANAGER', academy, scope: 'NCOA',
        permissions: ['schedule.read', 'schedule.write', 'schedule.import', 'location.manage', 'conflict.resolve']
      };
      setRole('ADMIN');
      setAccessProfile(emulatorProfile);
      setStudentCycleName(null);
      setSelectedDateId(null);
      setIsTestMode(false);
      hasAutoSelectedTodayRef.current = false;
      if (rememberLogin) {
        window.localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify({
          role: 'ADMIN', profile: emulatorProfile, localEmulator: true
        }));
      }
      return true;
    }
    const requestedTestMode = code.trim() === '318709';
    const normalizedCode = normalizeAccessCode(code);
    const isWeb = !Capacitor.isNativePlatform();
    const webProfile = resolveAccessCode(code, schedules, academy);
    if (isWeb && webProfile && !canUseWebsite(webProfile) && !requestedTestMode) return false;

    // Preserve the released BLC SGL login exactly as it worked before the
    // NCOA/KTA access-code extensions. Legacy codes must never depend on the
    // new academy resolver or server authentication path.
    if (normalizedCode === '9876') {
      try { await prepareNotificationEnvironment(false); } catch { return false; }
      const legacyProfile: AccessProfile = {
        role: 'VIEWER',
        accessLevel: 'SENIOR',
        academy: 'BLC',
        scope: 'BLC',
        permissions: ['schedule.read']
      };
      hasAutoSelectedTodayRef.current = false;
      setRole('VIEWER');
      setAccessProfile(legacyProfile);
      setAcademy('BLC');
      setStudentCycleName(null);
      if (typeof window !== 'undefined') {
        if (rememberLogin) {
          window.localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify({
            code: '9876',
            role: 'VIEWER',
            profile: legacyProfile
          }));
        } else {
          window.localStorage.removeItem(LOGIN_STORAGE_KEY);
        }
      }
      return true;
    }

    const inferredAcademy: AcademyId = normalizedCode.startsWith('KTA') ? 'KTA' : 'BLC';
    let schedulesForLogin = schedules;

    if (inferredAcademy !== academy && /^(BLC|KTA)\d{4}$/.test(normalizedCode)) {
      try {
        const path = `${getAcademyConfig(inferredAcademy).databasePrefix}schedules`;
        const response = await fetch(getDatabaseRestUrl(path), { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          schedulesForLogin = data && typeof data === 'object'
            ? Object.values(data as Record<string, DailySchedule>)
            : [];
        }
      } catch {
        return false;
      }
    }

    let login = resolveAccessCode(code, schedulesForLogin, academy);
    if (isWeb && !login && !requestedTestMode) return false;

    if (login?.requiresServerAuth) {
      try {
        selectStagingSession(false);
        await createAdminSession(normalizedCode);
      } catch {
        return false;
      }
    } else if (!login?.role) {
      // Keep the existing test administrator flow available during migration.
      try {
        selectStagingSession(requestedTestMode);
        await createAdminSession(code.trim());
        login = {
          role: 'ADMIN',
          accessLevel: 'NCOA_MANAGER',
          academy: 'BLC',
          scope: 'NCOA',
          permissions: ['schedule.read', 'schedule.write', 'schedule.import', 'location.manage', 'conflict.resolve']
        };
      } catch {
        clearAdminSessionToken();
        selectStagingSession(false);
        return false;
      }
    }

    if (isWeb && !canUseWebsite(login) && !requestedTestMode) return false;
    try { await prepareNotificationEnvironment(requestedTestMode); } catch {
      clearAdminSessionToken();
      selectStagingSession(false);
      return false;
    }
    hasAutoSelectedTodayRef.current = false;
    setTvCycle(null);
    setSelectedDateId(null);
    if (login.academy !== academy || requestedTestMode !== isTestMode) {
      setSchedules([]);
      setIsLoading(true);
    }
    setRole(login.role);
    setAccessProfile(login);
    setAcademy(login.academy);
    setIsTestMode(requestedTestMode);
    setNotificationOnboardingComplete(false);
    setPendingNotification(null);
    setNotificationFocus(null);
    setForegroundNotification(null);
    if (requestedTestMode) {
      setDisplayMode('auto');
      window.localStorage.setItem(DISPLAY_MODE_STORAGE_KEY, 'auto');
    }
    setStudentCycleName(login.studentCycleName || null);

    if (typeof window !== 'undefined') {
      if (rememberLogin || requestedTestMode) {
        window.localStorage.setItem(
          LOGIN_STORAGE_KEY,
          JSON.stringify({
            code: normalizedCode,
            role: login.role,
            testMode: requestedTestMode,
            profile: login
          })
        );
      } else {
        window.localStorage.removeItem(LOGIN_STORAGE_KEY);
      }
    }

    if (typeof window !== 'undefined') window.dispatchEvent(new Event('ncoa-test-session-changed'));
    return true;
  };

  const handleBackToCalendar = () => {
    if (isTvDisplay) return;
    hasAutoSelectedTodayRef.current = true;
    setSelectedDateId(null);
    if (role === 'STUDENT') {
      // Complete navigation first. An unavailable ad must never delay or block it.
      window.setTimeout(() => {
        void recordStudentCalendarReturnAndMaybeShow(isTestMode);
      }, 350);
    }
  };

  useEffect(() => {
    if (role === 'STUDENT' && selectedDateId) {
      void prepareStudentInterstitial(isTestMode);
    }
  }, [role, selectedDateId, isTestMode]);

  const handleAcademyChange = (nextAcademy: AcademyId) => {
    if (accessProfile?.scope !== 'NCOA' || nextAcademy === academy) return;
    setAcademy(nextAcademy);
    setAccessProfile({ ...accessProfile, academy: nextAcademy });
    setSelectedDateId(null);
    setStudentCycleName(null);
    setSchedules([]);
    setIsLoading(true);
    hasAutoSelectedTodayRef.current = false;
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

  const tvAvailableSchedules = useMemo(() => schedules.filter(schedule =>
    !schedule.academy || schedule.academy === academy
  ), [schedules, academy]);
  const effectiveTvCycle = tvCycle !== null && tvAvailableSchedules.some(schedule => schedule.cycleName === tvCycle)
    ? tvCycle
    : chooseAutoTvSchedule(tvAvailableSchedules, getLocalTodayString(new Date(tvNow)), tvNow, getScheduleEndDateTime)?.cycleName || '';

  const filteredSchedules = useMemo(() => {
    if (isTvDisplay) {
      return tvAvailableSchedules.filter(schedule => schedule.cycleName === effectiveTvCycle)
        .sort((a, b) => a.date.localeCompare(b.date));
    }
    if (role === 'STUDENT') {
      return schedules.filter(s => s.cycleName === studentCycleName);
    }
    return schedules;
  }, [role, schedules, studentCycleName, isTvDisplay, tvAvailableSchedules, effectiveTvCycle]);

  useEffect(() => {
    if (!isTvDisplay) return;
    const nextDate = chooseTvSchedule(filteredSchedules, getLocalTodayString(), selectedDateId)?.date || null;
    if (nextDate !== selectedDateId) setSelectedDateId(nextDate);
  }, [isTvDisplay, filteredSchedules, selectedDateId]);

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
    return titleCycleName ? `${academy} CLASS ${titleCycleName}` : `${academy} CLASS`;
  }, [role, studentCycleName, activeCycleName, academy]);

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
    return <Login onLogin={handleLogin} webOnly={!Capacitor.isNativePlatform()} emulatorMode={useFirebaseEmulators} />;
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
  const notificationOnboarding = !useFirebaseEmulators && role && isTrackingAuthorizationResolved && !notificationOnboardingComplete && isPhoneDevice() ? (
    <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[65] mx-auto max-w-md rounded-2xl border border-green-200 bg-white p-3 shadow-2xl">
      <div className="mb-2 text-center">
        <div className="text-sm font-black text-gray-900">Enable Notifications</div>
        <div className="text-[11px] font-semibold text-gray-500">Get schedule update alerts on this device.</div>
      </div>
      <NotificationPrompt
        role={role}
        academy={academy}
        cycleName={role === 'STUDENT' ? studentCycleName : null}
        autoPrompt={isTestMode}
        testMode={isTestMode}
        hideWhenGranted
        onStatusChange={(status) => setNotificationOnboardingComplete(status === 'granted')}
      />
    </div>
  ) : null;
  const testModeBadge = isTestMode ? (
    <div className="fixed bottom-3 left-1/2 z-[75] -translate-x-1/2 rounded-full border-2 border-amber-300 bg-amber-100 px-4 py-2 text-xs font-black text-amber-900 shadow-xl">
      TEST MODE ? Separate test database ? This device only
    </div>
  ) : null;
  const emulatorBadge = useFirebaseEmulators && role ? (
    <div className="fixed bottom-3 left-1/2 z-[75] -translate-x-1/2 -translate-y-12 rounded-full border-2 border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-black text-amber-950 shadow-xl">
      LOCAL FIREBASE EMULATOR · TEST DATA ONLY · NOTIFICATIONS DISABLED
    </div>
  ) : null;

  const selectedSchedule = isTvDisplay
    ? chooseTvSchedule(filteredSchedules, getLocalTodayString(), selectedDateId)
    : filteredSchedules.find(s => s.date === selectedDateId);
  const renderGeneralSettings = () => role ? (
    <GeneralSettings
      tvDisplay={isTvDisplay}
      role={role}
      academy={academy}
      cycleName={role === 'STUDENT' ? studentCycleName : null}
      schedules={schedules}
      displayMode={displayMode}
      onDisplayModeChange={handleDisplayModeChange}
      darkMode={darkMode}
      onDarkModeChange={handleDarkModeChange}
      onLogout={handleLogout}
      onDeleteCycle={handleDeleteCycle}
      onResetSchedules={handleResetSchedules}
      testMode={isTestMode}
      notificationsDisabled={useFirebaseEmulators}
    />
  ) : null;

  const tvControls = isTvDisplay ? (
    <TvScheduleControls
      schedules={tvAvailableSchedules}
      cycle={effectiveTvCycle}
      automatic={tvCycle === null || !tvAvailableSchedules.some(schedule => schedule.cycleName === tvCycle)}
      date={selectedSchedule?.date}
      onCycleChange={cycle => { setTvCycle(cycle); setSelectedDateId(null); }}
      onDateChange={setSelectedDateId}
      settings={renderGeneralSettings()}
    />
  ) : null;

  if (selectedSchedule) {
    const currentIndex = filteredSchedules.indexOf(selectedSchedule);
    const hasPrev = currentIndex > 0;
    const hasNext = currentIndex < filteredSchedules.length - 1;

    const handlePrev = hasPrev ? () => setSelectedDateId(filteredSchedules[currentIndex - 1].date) : undefined;
    const handleNext = hasNext ? () => setSelectedDateId(filteredSchedules[currentIndex + 1].date) : undefined;

    return (
      <>
      {foregroundNotificationToast}
      {notificationOnboarding}
      {testModeBadge}
      {emulatorBadge}
      <DailyView 
        schedule={selectedSchedule} 
        role={role}
        onBack={isTvDisplay ? undefined : handleBackToCalendar}
        viewControls={tvControls}
        onSave={handleSaveEvent}
        onSaveDayLabel={handleSaveDayLabel}
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
        testMode={isTestMode}
        displayMode={isTvDisplay ? 'tv' : displayMode}
      />
      {pendingNotification && (
        <ScheduleNotificationModal
          change={pendingNotification}
          academy={academy}
          testMode={isTestMode}
          onClose={() => setPendingNotification(null)}
        />
      )}
      <NcoaChatbot academy={academy} role={role} cycleName={role === 'STUDENT' ? studentCycleName : activeCycleName} />
      </>
    );
  }

  if (isTvDisplay) {
    return (
      <div className="app-safe-screen daily-screen display-mode-tv bg-gray-100 flex flex-col">
        {emulatorBadge}
        {tvControls}
        <div className="flex flex-1 items-center justify-center p-6 text-center font-bold text-gray-600">
          No schedules available for {academy}.
        </div>
        <NcoaChatbot academy={academy} role={role} cycleName={effectiveTvCycle || null} />
      </div>
    );
  }

  return (
    <>
      {foregroundNotificationToast}
      {notificationOnboarding}
      {testModeBadge}
      {emulatorBadge}
      <Calendar 
        schedules={filteredSchedules} 
        academy={academy}
        currentCycleName={role === 'STUDENT' ? studentCycleName : activeCycleName}
        onSelectDate={(date) => setSelectedDateId(date)} 
        onSelectSearchResult={(result: EventSearchResult) => {
          hasAutoSelectedTodayRef.current = true;
          setSelectedDateId(result.date);
          setNotificationFocus(null);
          window.setTimeout(() => setNotificationFocus({
            date: result.date,
            targetId: `event:${result.event.id}`,
            changeType: 'Search result',
            previewText: `Search result: ${result.event.eventName}`,
            changedFields: ['eventName']
          }), 0);
        }}
        role={role}
        cycleTitle={cycleTitle}
        onOpenImport={() => setIsImportModalOpen(true)}
        settingsControl={(
          <div className="flex items-center justify-end gap-2">
            {accessProfile?.scope === 'NCOA' && (
              <AcademySwitcher academy={academy} onChange={handleAcademyChange} />
            )}
            {renderGeneralSettings()}
          </div>
        )}
        showAdBanner={!isImportModalOpen}
        testMode={isTestMode}
        displayMode={displayMode}
      />
      {isImportModalOpen && (
        <AcademyScheduleImportModal
          academy={academy}
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportSchedules}
          locations={locations}
          uniforms={uniforms}
        />
      )}
      <NcoaChatbot academy={academy} role={role} cycleName={role === 'STUDENT' ? studentCycleName : activeCycleName} />
    </>
  );
}

export default App;
