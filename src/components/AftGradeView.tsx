// src/components/AftGradeView.tsx
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ref as dbRef, onValue, set as dbSet, get as dbGet, serverTimestamp } from 'firebase/database';
import { db } from '../firebase';
import type { DisplayMode } from '../App';
import {
  calculateOfficialAftScore,
  getOfficialPassingStandard,
  AGE_GROUP_KEYS,
  MDL_MALE_TABLE,
  HRP_MALE_TABLE,
  SDC_MALE_TABLE,
  PLK_MALE_TABLE,
  TWO_MILE_RUN_MALE_TABLE,
  type AgeGroupKey
} from '../data/aftStandards2025';

interface Props {
  onBack: () => void;
  displayMode: DisplayMode;
}

export type AgeGroup = '17-21' | '22-26' | '27-31' | '32-36' | '37-41' | '42-46' | '47-51' | '52-56' | '57-61' | '62+';

export interface TraineeRecord {
  id: string;
  rosterNumber: string; // e.g. "001", "12"
  vestNumber: string;   // e.g. "1", "07"
  name: string;
  age: number;
  ageGroup: AgeGroup;
  scores: {
    MDL: string;
    MDL2?: string;
    HRP: string;
    SDC: string;
    PLK: string;
    '2MR': string;
  };
}

export interface LaneConfig {
  laneNumber: number;
  vestColor: string;
  vestColorCode: string;
}

interface EventConfig {
  id: string;
  name: string;
  code: 'MDL' | 'HRP' | 'SDC' | 'PLK' | '2MR';
  unit: string;
  minVal: number;
  maxVal: number;
  step: number;
  placeholder: string;
  isTime?: boolean;
  desc: string;
}

const AFT_EVENTS: EventConfig[] = [
  { id: 'mdl', name: '3-Repetition Maximum Deadlift', code: 'MDL', unit: 'lbs', minVal: 80, maxVal: 350, step: 10, placeholder: '140', desc: 'Lower body & core max strength' },
  { id: 'hrp', name: 'Hand-Release Push-Up', code: 'HRP', unit: 'reps', minVal: 0, maxVal: 70, step: 1, placeholder: '20', desc: '2-min upper body endurance' },
  { id: 'sdc', name: 'Sprint-Drag-Carry', code: 'SDC', unit: 'min:sec', minVal: 75, maxVal: 240, step: 1, placeholder: '2:30', isTime: true, desc: '5x 50m anaerobic capacity' },
  { id: 'plk', name: 'Plank', code: 'PLK', unit: 'min:sec', minVal: 60, maxVal: 230, step: 1, placeholder: '2:00', isTime: true, desc: 'Core stability & endurance' },
  { id: 'tmr', name: '2-Mile Run', code: '2MR', unit: 'min:sec', minVal: 750, maxVal: 1500, step: 1, placeholder: '18:00', isTime: true, desc: 'Aerobic endurance test' },
];

const AGE_GROUPS: AgeGroup[] = [
  '17-21', '22-26', '27-31', '32-36', '37-41',
  '42-46', '47-51', '52-56', '57-61', '62+'
];

export const VEST_COLORS = [
  { name: 'Red', code: '#EF4444', text: 'text-red-500', bg: 'bg-red-500' },
  { name: 'Blue', code: '#3B82F6', text: 'text-blue-500', bg: 'bg-blue-500' },
  { name: 'Yellow', code: '#EAB308', text: 'text-yellow-500', bg: 'bg-yellow-500' },
  { name: 'Green', code: '#22C55E', text: 'text-green-500', bg: 'bg-green-500' },
  { name: 'Orange', code: '#F97316', text: 'text-orange-500', bg: 'bg-orange-500' },
  { name: 'Purple', code: '#A855F7', text: 'text-purple-500', bg: 'bg-purple-500' },
  { name: 'Black', code: '#1E293B', text: 'text-slate-800', bg: 'bg-slate-800' },
  { name: 'White', code: '#F8FAFC', text: 'text-slate-400', bg: 'bg-slate-200' },
];

function getAgeGroupFromAge(age: number): AgeGroup {
  if (age <= 21) return '17-21';
  if (age <= 26) return '22-26';
  if (age <= 31) return '27-31';
  if (age <= 36) return '32-36';
  if (age <= 41) return '37-41';
  if (age <= 46) return '42-46';
  if (age <= 51) return '47-51';
  if (age <= 56) return '52-56';
  if (age <= 61) return '57-61';
  return '62+';
}

function calculateAftScore(
  eventCode: string, 
  rawVal: number, 
  ageGroup: AgeGroup
): number {
  return calculateOfficialAftScore(eventCode, rawVal, ageGroup);
}

function getMinimumPassingStandard(eventCode: string, ageGroup: AgeGroup): string {
  return getOfficialPassingStandard(eventCode, ageGroup);
}

function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0;
    const secs = parseInt(parts[1], 10) || 0;
    return mins * 60 + secs;
  }
  return parseFloat(timeStr) || 0;
}

function formatSecondsToTime(totalSecs: number): string {
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Auto-format user typed time inputs: 031 -> 0:31, 2107 -> 21:07, 145 -> 1:45
function formatTimeInput(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // If already in mm:ss format, ensure clean formatting
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':');
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10) || 0;
      const s = parseInt(parts[1], 10) || 0;
      return `${m}:${s.toString().padStart(2, '0')}`;
    }
    return trimmed;
  }

  // Pure digits auto-conversion
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.length === 1 || digits.length === 2) {
    // e.g. "45" -> "0:45", "5" -> "0:05"
    const s = parseInt(digits, 10);
    return `0:${s.toString().padStart(2, '0')}`;
  } else if (digits.length === 3) {
    // e.g. "031" -> "0:31", "145" -> "1:45"
    const m = parseInt(digits.slice(0, 1), 10);
    const s = parseInt(digits.slice(1), 10);
    return `${m}:${s.toString().padStart(2, '0')}`;
  } else {
    // e.g. "2107" -> "21:07", "12345" -> last 2 are seconds
    const m = parseInt(digits.slice(0, digits.length - 2), 10);
    const s = parseInt(digits.slice(digits.length - 2), 10);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}

const STORAGE_KEY_TRAINEES = 'blc_aft_trainees_lane_v2';
const STORAGE_KEY_LANE_CONFIG = 'blc_aft_lane_configs_v2';
const STORAGE_KEY_ACTIVE_COUNTS = 'blc_aft_lane_active_counts_v2';

const createDefaultLaneTrainees = (): Record<number, TraineeRecord[]> => {
  const result: Record<number, TraineeRecord[]> = {};
  for (let l = 1; l <= 10; l++) {
    const list: TraineeRecord[] = [];
    for (let r = 1; r <= 10; r++) {
      list.push({
        id: `lane-${l}-t-${r}`,
        rosterNumber: `${(l - 1) * 10 + r}`,
        vestNumber: `${r}`,
        name: `Trainee ${(l - 1) * 10 + r}`,
        age: 22,
        ageGroup: '22-26',
        scores: {
          MDL: '',
          MDL2: '',
          HRP: '',
          SDC: '',
          PLK: '',
          '2MR': ''
        }
      });
    }
    result[l] = list;
  }
  return result;
};

const createDefaultLaneConfigs = (): Record<number, LaneConfig> => {
  const result: Record<number, LaneConfig> = {};
  for (let l = 1; l <= 10; l++) {
    const color = VEST_COLORS[(l - 1) % VEST_COLORS.length];
    result[l] = {
      laneNumber: l,
      vestColor: color.name,
      vestColorCode: color.code
    };
  }
  return result;
};

export default function AftGradeView({ onBack }: Props) {
  // Screen mode: 'lane_select' (Hub) or 'grading' (Lane Evaluation)
  const [currentView, setCurrentView] = useState<'lane_select' | 'grading'>('lane_select');
  const [selectedLane, setSelectedLane] = useState<number>(1);
  const [currentEventIndex, setCurrentEventIndex] = useState<number>(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Lane Trainees Data (Persisted across sessions)
  const [laneTrainees, setLaneTrainees] = useState<Record<number, TraineeRecord[]>>(() => {
    if (typeof window === 'undefined') return createDefaultLaneTrainees();
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_TRAINEES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load trainees:', e);
    }
    return createDefaultLaneTrainees();
  });

  // Lane Configuration (Vest Color, etc.)
  const [laneConfigs, setLaneConfigs] = useState<Record<number, LaneConfig>>(() => {
    if (typeof window === 'undefined') return createDefaultLaneConfigs();
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_LANE_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load lane configs:', e);
    }
    return createDefaultLaneConfigs();
  });

  // Active Count per Lane (1 to 10)
  const [activeCountByLane, setActiveCountByLane] = useState<Record<number, number>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = window.localStorage.getItem(STORAGE_KEY_ACTIVE_COUNTS);
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load active counts:', e);
      }
    }
    const initial: Record<number, number> = {};
    for (let i = 1; i <= 10; i++) initial[i] = 10;
    return initial;
  });

  // Per-trainee individual start times for SDC event
  const [sdcStartTimes, setSdcStartTimes] = useState<Record<string, number>>({});

  // Multi-trainee selection for PLK batch evaluation
  const [selectedPlkIds, setSelectedPlkIds] = useState<string[]>([]);
  const [plkRunningIds, setPlkRunningIds] = useState<string[]>([]);
  const [plkStartedAt, setPlkStartedAt] = useState<number | null>(null);

  // Global Event Stopwatch state (SDC, PLK, 2MR)
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedTimeMs, setElapsedTimeMs] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Standards Modal Viewer State
  const [showStandardsModal, setShowStandardsModal] = useState(false);
  const [standardsEventTab, setStandardsEventTab] = useState<'MDL' | 'HRP' | 'SDC' | 'PLK' | '2MR'>('MDL');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_TRAINEES, JSON.stringify(laneTrainees));
    }
  }, [laneTrainees]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_LANE_CONFIG, JSON.stringify(laneConfigs));
    }
  }, [laneConfigs]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY_ACTIVE_COUNTS, JSON.stringify(activeCountByLane));
    }
  }, [activeCountByLane]);

  // Firebase RTDB Connection State (.info/connected)
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);

  // 2MR Synchronized Master Timer from Firebase RTDB (All 10 Graders synchronized)
  const [twoMileRunSync, setTwoMileRunSync] = useState<{
    startTime: number | null;
    status: 'idle' | 'running' | 'finished';
    startedBy?: string;
  }>({ startTime: null, status: 'idle' });

  // Firebase RTDB Server Time Offset (.info/serverTimeOffset)
  const serverTimeOffsetRef = useRef<number>(0);

  // Real-time listener for Firebase RTDB Connection Health & Server Time Offset
  useEffect(() => {
    try {
      const connectedRef = dbRef(db, '.info/connected');
      const offsetRef = dbRef(db, '.info/serverTimeOffset');
      
      const unsubConnected = onValue(connectedRef, (snap) => {
        setIsFirebaseConnected(snap.val() === true);
      });
      const unsubOffset = onValue(offsetRef, (snap) => {
        serverTimeOffsetRef.current = snap.val() || 0;
      });

      return () => {
        unsubConnected();
        unsubOffset();
      };
    } catch {
      setIsFirebaseConnected(false);
    }
  }, []);

  // Real-time listener & Immediate Fetch for Shared Trainee Roster from Firebase RTDB
  useEffect(() => {
    const rosterRef = dbRef(db, 'aft_sessions/roster');

    // 1. Immediate One-Time Fetch on Mount
    dbGet(rosterRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data && data.laneTrainees) {
            setLaneTrainees(data.laneTrainees);
            if (data.activeCountByLane) {
              setActiveCountByLane(data.activeCountByLane);
            }
          }
        }
      })
      .catch((err) => {
        console.warn('Initial Firebase roster get failed:', err);
      });

    // 2. Real-time Live Subscription
    const unsubscribe = onValue(
      rosterRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data && data.laneTrainees) {
          setLaneTrainees(data.laneTrainees);
          if (data.activeCountByLane) {
            setActiveCountByLane(data.activeCountByLane);
          }
        }
      },
      (error) => {
        console.warn('Firebase roster onValue listener error:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener & Immediate Fetch for 2MR Master Timer in Firebase
  useEffect(() => {
    try {
      const runRef = dbRef(db, 'aft_sessions/2mr_master_timer');

      // 1. Immediate Fetch on Mount / Page Switch
      dbGet(runRef).then((snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val && val.status === 'running' && typeof val.startTime === 'number') {
            setTwoMileRunSync(val);
          }
        }
      }).catch((e) => console.warn('Initial 2MR get failed:', e));

      // 2. Real-time Live Subscription
      const unsubscribe = onValue(
        runRef,
        (snapshot) => {
          const val = snapshot.val();
          if (val && val.status === 'running' && typeof val.startTime === 'number') {
            setTwoMileRunSync(val);
          } else if (val && val.status === 'finished') {
            setTwoMileRunSync(val);
          } else {
            setTwoMileRunSync({ startTime: null, status: 'idle' });
          }
        },
        (error) => {
          console.warn('Firebase RTDB 2MR read error:', error);
          setIsFirebaseConnected(false);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      console.warn('Firebase RTDB sync not available, falling back to local timer:', e);
      setIsFirebaseConnected(false);
    }
  }, []);

  // 2MR Master Timer Start (Triggered by Starter at the starting line)
  const handleStart2MRMasterTimer = async () => {
    const serverNow = Date.now() + serverTimeOffsetRef.current;
    try {
      const runRef = dbRef(db, 'aft_sessions/2mr_master_timer');
      await dbSet(runRef, {
        status: 'running',
        startTime: serverNow,
        startedAtServer: serverTimestamp(),
        startedBy: `Lane ${selectedLane} Grader`
      });
    } catch (e) {
      console.error('Failed to broadcast 2MR start to Firebase (Check Database Rules):', e);
      // Local fallback
      setTwoMileRunSync({ startTime: serverNow, status: 'running' });
    }
  };

  // 2MR Master Timer Reset
  const handleReset2MRMasterTimer = async () => {
    try {
      const runRef = dbRef(db, 'aft_sessions/2mr_master_timer');
      await dbSet(runRef, {
        status: 'idle',
        startTime: null,
        resetAtServer: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to reset 2MR timer in Firebase:', e);
      setTwoMileRunSync({ startTime: null, status: 'idle' });
    }
  };

  // Reset timer when switching events
  useEffect(() => {
    setTimerRunning(false);
    setElapsedTimeMs(0);
    setSdcStartTimes({});
    setSelectedPlkIds([]);
    setPlkRunningIds([]);
    setPlkStartedAt(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [currentEventIndex]);

  // Live stopwatch ticking logic for local events (SDC, PLK)
  useEffect(() => {
    const curCode = AFT_EVENTS[currentEventIndex]?.code;
    if (curCode === '2MR') return; // Handled separately by Firebase RTDB sync

    if (timerRunning) {
      startTimeRef.current = performance.now() - elapsedTimeMs;
      timerRef.current = window.setInterval(() => {
        setElapsedTimeMs(performance.now() - startTimeRef.current);
      }, 50);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, currentEventIndex]);

  // Live timer display calculation for 2MR (Firebase RTDB master clock sync with serverTimeOffset)
  useEffect(() => {
    const curCode = AFT_EVENTS[currentEventIndex]?.code;
    if (curCode === '2MR') {
      if (twoMileRunSync.status === 'running' && twoMileRunSync.startTime) {
        const interval = window.setInterval(() => {
          const currentServerTime = Date.now() + serverTimeOffsetRef.current;
          const elapsed = currentServerTime - (twoMileRunSync.startTime || currentServerTime);
          setElapsedTimeMs(Math.max(0, elapsed));
        }, 50);
        return () => clearInterval(interval);
      } else {
        setElapsedTimeMs(0);
      }
    }
  }, [currentEventIndex, twoMileRunSync]);

  const currentEvent = AFT_EVENTS[currentEventIndex];
  const isSummaryView = currentEventIndex >= AFT_EVENTS.length;
  const currentLaneConfig = laneConfigs[selectedLane] || { laneNumber: selectedLane, vestColor: 'Red', vestColorCode: '#EF4444' };
  const currentTrainees = (laneTrainees[selectedLane] || []).slice(0, activeCountByLane[selectedLane] || 10);

  // Toggle selection for PLK batch test
  const togglePlkSelection = (traineeId: string) => {
    setSelectedPlkIds(prev =>
      prev.includes(traineeId) ? prev.filter(id => id !== traineeId) : [...prev, traineeId]
    );
  };

  const selectAllPlkTrainees = () => {
    setSelectedPlkIds(currentTrainees.map(t => t.id));
  };

  const clearPlkSelection = () => {
    setSelectedPlkIds([]);
  };

  // Start PLK batch measurement (Always starts fresh from 0)
  const handleStartPlkBatch = () => {
    if (selectedPlkIds.length === 0) return;
    const now = performance.now();
    setPlkStartedAt(now);
    setPlkRunningIds([...selectedPlkIds]);
    startTimeRef.current = now;
    setElapsedTimeMs(0);
    setTimerRunning(true);
  };

  // Reset / Cancel PLK batch measurement so user can re-select or restart
  const handleCancelPlkBatch = () => {
    setTimerRunning(false);
    setElapsedTimeMs(0);
    setPlkStartedAt(null);
    setPlkRunningIds([]);
  };

  const updateTrainee = (traineeId: string, updates: Partial<TraineeRecord>) => {
    setLaneTrainees(prev => {
      const list = prev[selectedLane] || [];
      const nextList = list.map(t => {
        if (t.id === traineeId) {
          const updated = { ...t, ...updates };
          if (updates.age !== undefined) {
            updated.ageGroup = getAgeGroupFromAge(updates.age);
          }
          return updated;
        }
        return t;
      });
      const nextState = { ...prev, [selectedLane]: nextList };
      try {
        const laneRef = dbRef(db, `aft_sessions/roster/laneTrainees/${selectedLane}`);
        dbSet(laneRef, nextList);
      } catch (e) {
        console.warn('Failed to sync trainee update to Firebase:', e);
      }
      return nextState;
    });
  };

  const handleScoreChange = (traineeId: string, eventCode: 'MDL' | 'MDL2' | 'HRP' | 'SDC' | 'PLK' | '2MR', value: string) => {
    setLaneTrainees(prev => {
      const list = prev[selectedLane] || [];
      const nextList = list.map(t => {
        if (t.id === traineeId) {
          return {
            ...t,
            scores: {
              ...t.scores,
              [eventCode]: value
            }
          };
        }
        return t;
      });
      const nextState = { ...prev, [selectedLane]: nextList };
      try {
        const laneRef = dbRef(db, `aft_sessions/roster/laneTrainees/${selectedLane}`);
        dbSet(laneRef, nextList);
      } catch (e) {
        console.warn('Failed to sync score to Firebase:', e);
      }
      return nextState;
    });
  };

  const handleTimerAction = (traineeId: string, eventCode: 'SDC' | 'PLK' | '2MR') => {
    const now = performance.now();

    if (eventCode === 'SDC') {
      const startedAt = sdcStartTimes[traineeId];
      if (!startedAt) {
        // First click: Start SDC timer for this soldier (fresh from 0 if no other soldier running)
        setSdcStartTimes(prev => {
          const isFirstRunning = Object.keys(prev).length === 0;
          if (isFirstRunning) {
            startTimeRef.current = now;
            setElapsedTimeMs(0);
            setTimerRunning(true);
          }
          return { ...prev, [traineeId]: now };
        });
      } else {
        // Second click: Record elapsed time for this soldier
        const durationSec = Math.max(1, Math.round((now - startedAt) / 1000));
        const formatted = formatSecondsToTime(durationSec);
        handleScoreChange(traineeId, 'SDC', formatted);
        setSdcStartTimes(prev => {
          const next = { ...prev };
          delete next[traineeId];
          if (Object.keys(next).length === 0) {
            setTimerRunning(false);
            setElapsedTimeMs(0);
          }
          return next;
        });
      }
    } else if (eventCode === 'PLK') {
      // PLK Individual Finish Record
      const isRunning = plkRunningIds.includes(traineeId);
      if (isRunning && plkStartedAt) {
        const durationSec = Math.max(1, Math.round((now - plkStartedAt) / 1000));
        const formatted = formatSecondsToTime(durationSec);
        handleScoreChange(traineeId, 'PLK', formatted);

        // Deselect recorded trainee from selectedPlkIds
        setSelectedPlkIds(prev => prev.filter(id => id !== traineeId));

        setPlkRunningIds(prev => {
          const next = prev.filter(id => id !== traineeId);
          if (next.length === 0) {
            setTimerRunning(false);
            setElapsedTimeMs(0);
            setPlkStartedAt(null);
          }
          return next;
        });
      } else {
        // Direct record from global clock if not part of active batch
        const formatted = formatSecondsToTime(Math.floor(elapsedTimeMs / 1000));
        handleScoreChange(traineeId, 'PLK', formatted);
        setSelectedPlkIds(prev => prev.filter(id => id !== traineeId));
      }
    } else {
      // 2MR: Apply current synchronized master clock time
      let formatted = '0:00';
      if (twoMileRunSync.status === 'running' && twoMileRunSync.startTime) {
        const durationSec = Math.max(1, Math.floor((Date.now() - twoMileRunSync.startTime) / 1000));
        formatted = formatSecondsToTime(durationSec);
      } else {
        formatted = formatSecondsToTime(Math.floor(elapsedTimeMs / 1000));
      }
      handleScoreChange(traineeId, '2MR', formatted);
    }
  };

  const updateLaneVestColor = (colorName: string, colorCode: string) => {
    setLaneConfigs(prev => ({
      ...prev,
      [selectedLane]: {
        ...prev[selectedLane],
        vestColor: colorName,
        vestColorCode: colorCode
      }
    }));
  };

  // Excel (.xlsx / .csv) Roster Import Handler (Supports RN, Name, Age)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 }) as unknown[][];

        if (!rows || rows.length < 2) {
          setImportStatus('Error: Empty or invalid Excel sheet.');
          return;
        }

        // Auto-detect columns: RN (Roster Number), Name, Age
        const header = (rows[0] as string[]).map(h => String(h || '').trim().toLowerCase());
        const rosterIdx = header.findIndex(h => h === 'rn' || h.includes('roster') || h.includes('number') || h.includes('no') || h.includes('num') || h.includes('순번') || h.includes('번호'));
        const nameIdx = header.findIndex(h => h.includes('name') || h.includes('이름') || h.includes('성명') || h.includes('trainee'));
        const ageIdx = header.findIndex(h => h.includes('age') || h.includes('나이') || h.includes('연령'));

        // Collect all valid trainee rows
        const rawTrainees: { rn: string; name: string; age: number }[] = [];

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown[];
          if (!row || row.length === 0 || !row.some(cell => cell !== undefined && cell !== '')) continue;

          const rawRoster = rosterIdx !== -1 ? String(row[rosterIdx] || '').trim() : String(rawTrainees.length + 1);
          const rawName = nameIdx !== -1 ? String(row[nameIdx] || '').trim() : `Trainee ${rawRoster}`;
          const rawAge = ageIdx !== -1 ? parseInt(String(row[ageIdx] || '22'), 10) || 22 : 22;

          rawTrainees.push({
            rn: rawRoster,
            name: rawName,
            age: rawAge
          });
        }

        if (rawTrainees.length === 0) {
          setImportStatus('Error: No trainee data found in file.');
          return;
        }

        const totalTrainees = rawTrainees.length;
        // Distribute across 10 lanes: e.g. 80 -> 8 each, 81 -> 9,8,8... 82 -> 9,9,8,8...
        const basePerLane = Math.floor(totalTrainees / 10);
        const remainder = totalTrainees % 10;

        const counts: Record<number, number> = {};
        for (let l = 1; l <= 10; l++) {
          // First 'remainder' lanes get (basePerLane + 1), others get basePerLane
          const laneCap = l <= remainder ? basePerLane + 1 : basePerLane;
          counts[l] = Math.min(10, Math.max(1, laneCap));
        }

        const parsedTraineesByLane: Record<number, TraineeRecord[]> = {};
        let traineePointer = 0;

        for (let l = 1; l <= 10; l++) {
          const assignedCount = counts[l];
          const list: TraineeRecord[] = [];

          for (let pos = 1; pos <= assignedCount; pos++) {
            if (traineePointer < rawTrainees.length) {
              const item = rawTrainees[traineePointer++];
              list.push({
                id: `imp-l${l}-p${pos}-${Date.now()}`,
                rosterNumber: item.rn,
                vestNumber: `${pos}`,
                name: item.name,
                age: item.age,
                ageGroup: getAgeGroupFromAge(item.age),
                scores: { MDL: '', MDL2: '', HRP: '', SDC: '', PLK: '', '2MR': '' }
              });
            }
          }

          // Pad up to 10 with placeholders if needed
          while (list.length < 10) {
            const pos = list.length + 1;
            list.push({
              id: `lane-${l}-t-${pos}`,
              rosterNumber: `${(l - 1) * 10 + pos}`,
              vestNumber: `${pos}`,
              name: `Trainee ${(l - 1) * 10 + pos}`,
              age: 22,
              ageGroup: '22-26',
              scores: { MDL: '', MDL2: '', HRP: '', SDC: '', PLK: '', '2MR': '' }
            });
          }

          parsedTraineesByLane[l] = list;
        }

        setLaneTrainees(parsedTraineesByLane);
        setActiveCountByLane(counts);

        // Broadcast to all other devices/graders via Firebase RTDB
        try {
          const rosterRef = dbRef(db, 'aft_sessions/roster');
          dbSet(rosterRef, {
            laneTrainees: parsedTraineesByLane,
            activeCountByLane: counts,
            uploadedAt: serverTimestamp(),
            totalTrainees
          });
        } catch (e) {
          console.warn('Failed to broadcast roster to Firebase:', e);
        }

        setImportStatus(`✅ Successfully shared ${totalTrainees} trainees to all 10 lanes!`);
        setTimeout(() => {
          setShowImportModal(false);
          setImportStatus(null);
        }, 1200);
      } catch (err) {
        console.error('Import error:', err);
        setImportStatus('❌ Failed to parse Excel file. Please check format.');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Calculate Total Trainees count across active lanes
  const totalAssignedTrainees = Object.entries(activeCountByLane).reduce((sum, [, count]) => sum + (count || 0), 0);

  // Helper to compute RN Range for a lane
  const getLaneRosterRange = (laneNum: number) => {
    const trainees = (laneTrainees[laneNum] || []).slice(0, activeCountByLane[laneNum] || 8);
    if (trainees.length === 0) return 'No Trainees';
    const firstRN = trainees[0].rosterNumber;
    const lastRN = trainees[trainees.length - 1].rosterNumber;
    return firstRN === lastRN ? `RN #${firstRN}` : `RN #${firstRN} - #${lastRN}`;
  };

  const completedCount = currentTrainees.filter(t => {
    if (!currentEvent) return true;
    return (t.scores[currentEvent.code] || '').trim() !== '';
  }).length;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full bg-slate-900 flex justify-center items-stretch lg:items-center lg:py-4 lg:px-4 overflow-hidden">
      {/* Fixed Mobile Frame Container - 100dvh on mobile for full viewport fit and smooth scrolling */}
      <div className="w-full max-w-md h-full max-h-full lg:max-h-[880px] lg:rounded-3xl bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-gray-100 flex flex-col shadow-2xl overflow-hidden relative border border-slate-700/50">
        
        {/* ========================================================================= */}
        {/* SCREEN 1: LANE SELECTION HUB (Select Your Lane) */}
        {/* ========================================================================= */}
        {currentView === 'lane_select' && (
          <>
            <header className="sticky top-0 z-40 w-full bg-blue-900 text-white shadow-md shrink-0">
              <div className="flex items-center justify-between px-4 py-3">
                <button
                  onClick={onBack}
                  className="flex items-center gap-1 rounded-lg bg-blue-800 px-3 py-1.5 text-xs font-black text-white active:scale-95 hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  CALENDAR
                </button>
                <div className="text-center">
                  <h1 className="text-base font-black tracking-wider">AFT GRADER</h1>
                  <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Lane Selection</span>
                </div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white hover:bg-emerald-500 active:scale-95 shadow"
                  title="Upload Excel Roster"
                >
                  <span>📥</span>
                  <span>IMPORT</span>
                </button>
              </div>
            </header>

            <main className="w-full flex-1 overflow-y-auto overscroll-contain px-4 py-3 flex flex-col gap-2.5 min-h-0">
              {/* 10 Vertical Lane Selection Buttons */}
              <section className="space-y-2.5">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(laneNum => {
                  const cfg = laneConfigs[laneNum] || { vestColor: 'Red', vestColorCode: '#EF4444' };
                  const count = activeCountByLane[laneNum] || 8;
                  const rangeStr = getLaneRosterRange(laneNum);

                  return (
                    <button
                      key={laneNum}
                      type="button"
                      onClick={() => {
                        setSelectedLane(laneNum);
                        setCurrentEventIndex(0);
                        setCurrentView('grading');
                      }}
                      className="w-full rounded-2xl border border-gray-200 bg-white p-3.5 shadow-sm transition-all active:scale-[0.98] hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Lane Number & Vest Dot */}
                        <div 
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white font-black shadow"
                          style={{ backgroundColor: cfg.vestColorCode }}
                        >
                          <span className="text-sm font-black">L{laneNum}</span>
                        </div>

                        {/* Lane Details */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                              Lane {laneNum}
                            </span>
                            <span className="rounded-md bg-gray-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-black text-gray-600 dark:text-gray-300">
                              {count} Trainees
                            </span>
                          </div>
                          <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                            <span className="text-blue-700 dark:text-blue-300 font-extrabold">{rangeStr}</span>
                            <span>·</span>
                            <span>{cfg.vestColor} Vest</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Arrow Action */}
                      <div className="flex items-center text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  );
                })}
              </section>
            </main>
          </>
        )}

        {/* ========================================================================= */}
        {/* SCREEN 2: LANE GRADING VIEW (Active Evaluation Mode) */}
        {/* ========================================================================= */}
        {currentView === 'grading' && (
          <>
            {/* Top Header */}
            <header className="sticky top-0 z-40 w-full bg-blue-900 text-white shadow-md shrink-0">
              <div className="flex items-center justify-between px-3 py-2.5">
                <button
                  onClick={() => setCurrentView('lane_select')}
                  className="flex items-center gap-1 rounded-lg bg-blue-800 px-2.5 py-1.5 text-xs font-black text-white active:scale-95 hover:bg-blue-700"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                  LANES
                </button>
                <div className="text-center">
                  <h1 className="text-base font-black tracking-wider">AFT GRADER</h1>
                  <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">LANE {selectedLane} · EVALUATION</span>
                </div>
                {/* Standards Reference & Verification Button */}
                <button
                  type="button"
                  onClick={() => setShowStandardsModal(true)}
                  className="rounded-lg bg-blue-950 px-2 py-1 text-[10px] font-black text-amber-300 border border-blue-700 active:scale-95 hover:bg-blue-800"
                  title="View 2025 Official Score Standards"
                >
                  📜 STANDARDS
                </button>
              </div>
            </header>

        {/* Main Content Area - Scrollable with Mobile Touch Support */}
        <main className="w-full flex-1 overflow-y-auto overscroll-contain px-3 py-3 flex flex-col gap-3 min-h-0">
          {/* EVENT GRADING MODE (Step by Step) */}
          {!isSummaryView && currentEvent && (
            <>
              {/* Event Header Banner with integrated Stopwatch & Event-specific Controls (PLK, 2MR) */}
              <section className="rounded-2xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-950 p-3 text-white shadow-md flex flex-col justify-between min-h-[82px]">
                {/* Top Row: Event Badges + PLK Selection / 2MR Sync Status + Start/Reset Controls + Stopwatch */}
                <div className="flex items-center justify-between gap-2">
                  {/* Left: Badges */}
                  <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
                    <span className="rounded-md bg-amber-400 px-2 py-0.5 text-[10px] font-black text-blue-950 shrink-0">
                      EVENT {currentEventIndex + 1}/5
                    </span>
                    <span className="rounded-md bg-blue-800/80 px-2 py-0.5 text-[10px] font-black text-amber-300 shrink-0">
                      {completedCount}/{currentTrainees.length} GRADED
                    </span>
                  </div>

                  {/* Right: Master Start/Reset Controls (PLK, 2MR) + Pure Stopwatch Live Display */}
                  <div className="flex items-center gap-2 shrink-0 h-8">
                    {/* PLK Batch Start/Reset Button directly in Top Banner */}
                    {currentEvent.code === 'PLK' && (
                      timerRunning ? (
                        <button
                          type="button"
                          onClick={handleCancelPlkBatch}
                          className="h-8 rounded-xl bg-red-600 hover:bg-red-500 text-white px-2.5 text-[11px] font-black shadow transition-all active:scale-95 flex items-center justify-center gap-1 border border-red-400/40"
                          title="Reset / Re-select trainees"
                        >
                          <span>🔄</span>
                          <span>RESET</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartPlkBatch}
                          disabled={selectedPlkIds.length === 0}
                          className={`h-8 rounded-xl px-2.5 text-[11px] font-black shadow transition-all active:scale-95 flex items-center justify-center gap-1 ${
                            selectedPlkIds.length > 0
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-blue-950 font-bold'
                              : 'bg-blue-950 text-blue-400 opacity-50 cursor-not-allowed border border-blue-800'
                          }`}
                          title="Start PLK for selected trainees"
                        >
                          <span>🚀</span>
                          <span>START</span>
                        </button>
                      )
                    )}

                    {/* 2MR Master Clock Start/Reset Button */}
                    {currentEvent.code === '2MR' && (
                      <button
                        type="button"
                        onClick={twoMileRunSync.status === 'running' ? handleReset2MRMasterTimer : handleStart2MRMasterTimer}
                        className={`h-8 rounded-xl px-2.5 text-[11px] font-black shadow transition-all active:scale-95 flex items-center justify-center gap-1 ${
                          twoMileRunSync.status === 'running'
                            ? 'bg-red-600 hover:bg-red-500 text-white border border-red-400/40'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-blue-950 font-bold'
                        }`}
                        title={twoMileRunSync.status === 'running' ? 'Reset Master Clock' : 'Start Master Clock'}
                      >
                        <span>{twoMileRunSync.status === 'running' ? '🔄' : '🚀'}</span>
                        <span>{twoMileRunSync.status === 'running' ? 'RESET' : 'START'}</span>
                      </button>
                    )}

                    {/* Stopwatch Live Display with 2MR Synced Glowing Border */}
                    {currentEvent.isTime && (
                      <div className={`flex items-center justify-center bg-blue-950/90 px-2.5 h-8 rounded-xl transition-all shadow-inner ${
                        currentEvent.code === '2MR' && twoMileRunSync.status === 'running'
                          ? !isFirebaseConnected
                            ? 'border-2 border-red-500 ring-2 ring-red-500/50 animate-bounce'
                            : 'border-2 border-emerald-400 ring-2 ring-emerald-400/60 animate-pulse shadow-emerald-500/20'
                          : 'border border-blue-800/90'
                      }`}>
                        <div className="font-mono text-base font-black text-amber-300 tracking-wider">
                          {formatSecondsToTime(Math.floor(elapsedTimeMs / 1000))}
                          <span className="text-[10px] text-blue-200 font-normal">.{Math.floor((elapsedTimeMs % 1000) / 10).toString().padStart(2, '0')}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row: Event Title */}
                <div className="flex items-center justify-between pt-1">
                  <h2 className="text-sm font-black text-white">{currentEvent.name} ({currentEvent.code})</h2>
                  <span className="text-[10px] text-blue-200 font-semibold">Unit: {currentEvent.unit}</span>
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/30 mt-1">
                  <div
                    className="h-full bg-amber-400 transition-all duration-300 rounded-full"
                    style={{ width: `${(completedCount / Math.max(1, currentTrainees.length)) * 100}%` }}
                  />
                </div>
              </section>

              {/* Trainee Scoring List - Fixed Row Height & Standardized Right-Aligned Controls */}
              <section className="space-y-2.5">
                {currentTrainees.map((trainee) => {
                  const isMDL = currentEvent.code === 'MDL';
                  const isHRP = currentEvent.code === 'HRP';
                  const isSDC = currentEvent.code === 'SDC';
                  const isPLK = currentEvent.code === 'PLK';
                  const rawValStr = trainee.scores[currentEvent.code] || '';
                  const rawValStr2 = trainee.scores.MDL2 || '';
                  const hasInput = rawValStr.trim() !== '' || (isMDL && rawValStr2.trim() !== '');
                  const isSdcRunning = isSDC && !!sdcStartTimes[trainee.id];
                  const isPlkSelected = isPLK && selectedPlkIds.includes(trainee.id);
                  const isPlkActive = isPLK && plkRunningIds.includes(trainee.id);
                  const isPlkDisabled = isPLK && timerRunning && !isPlkActive;

                  return (
                    <div
                      key={trainee.id}
                      onClick={() => {
                        if (isPLK && !timerRunning) {
                          togglePlkSelection(trainee.id);
                        }
                      }}
                      className={`h-14 rounded-2xl border px-2.5 shadow-sm transition-all flex items-center justify-between gap-2 ${
                        isPLK && !timerRunning ? 'cursor-pointer hover:border-blue-400' : ''
                      } ${
                        isPlkActive || isSdcRunning
                          ? 'border-amber-400 bg-amber-50/20 dark:border-amber-500/80 dark:bg-amber-950/20'
                          : isPlkSelected
                            ? 'border-blue-500 bg-blue-50/60 dark:border-blue-500 dark:bg-blue-950/40 ring-2 ring-blue-400/40'
                            : isPlkDisabled
                              ? 'opacity-40 border-gray-200 bg-gray-100 dark:border-slate-800 dark:bg-slate-900 cursor-not-allowed'
                              : hasInput
                                ? 'border-blue-300 bg-white dark:border-blue-900/60 dark:bg-slate-900'
                                : 'border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                      }`}
                    >
                      {/* Left: Vest Number + Name (Static) + RN & Age */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {/* Direct Editable Vest Number Badge */}
                        <div 
                          className="flex h-8 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-white/30"
                          style={{ backgroundColor: currentLaneConfig.vestColorCode }}
                          title="Edit Vest Number"
                          onClick={(e) => isPLK && !timerRunning && e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={trainee.vestNumber}
                            onChange={(e) => updateTrainee(trainee.id, { vestNumber: e.target.value })}
                            onClick={(e) => isPLK && !timerRunning && e.stopPropagation()}
                            className="w-full bg-transparent text-center text-xs font-black text-white outline-none"
                            placeholder="#"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-black text-blue-700 dark:text-blue-300 shrink-0">
                              #{trainee.rosterNumber}
                            </span>
                            {/* Static Non-Editable Name */}
                            <span className="truncate text-xs font-black text-gray-900 dark:text-white">
                              {trainee.name}
                            </span>
                          </div>
                          <div className="text-[10px] font-bold text-gray-400 truncate">
                            Age: {trainee.age} ({trainee.ageGroup})
                          </div>
                        </div>
                      </div>

                      {/* Right: Score Input Area - Fixed Width (w-48: 192px) for 100% Consistent Alignment Across All Events */}
                      <div 
                        className="flex items-center justify-end gap-1.5 shrink-0 w-48"
                        onClick={(e) => isPLK && !timerRunning && e.stopPropagation()}
                      >
                        {isMDL ? (
                          <div className="flex items-center gap-1 w-full justify-end">
                            {/* Attempt 1 */}
                            <div className="relative w-23">
                              <input
                                type="number"
                                step={currentEvent.step}
                                placeholder={`1st (${getMinimumPassingStandard('MDL', trainee.ageGroup)})`}
                                value={rawValStr}
                                onChange={(e) => handleScoreChange(trainee.id, 'MDL', e.target.value)}
                                className="w-full h-8 rounded-xl border border-gray-300 bg-gray-50 px-1.5 text-xs font-black text-center text-gray-900 outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                title="1st Attempt (lbs)"
                              />
                            </div>

                            {/* Attempt 2 (Optional) */}
                            <div className="relative w-23">
                              <input
                                type="number"
                                step={currentEvent.step}
                                placeholder="2nd (opt)"
                                value={rawValStr2}
                                onChange={(e) => handleScoreChange(trainee.id, 'MDL2', e.target.value)}
                                className="w-full h-8 rounded-xl border border-dashed border-gray-300 bg-gray-50/70 px-1.5 text-xs font-black text-center text-gray-900 outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                                title="2nd Attempt (Optional lbs)"
                              />
                            </div>
                          </div>
                        ) : isHRP ? (
                          /* HRP: Single Reps Input stretched to align identically */
                          <div className="relative w-full flex justify-end">
                            <input
                              type="number"
                              step={currentEvent.step}
                              placeholder={getMinimumPassingStandard(currentEvent.code, trainee.ageGroup)}
                              value={rawValStr}
                              onChange={(e) => handleScoreChange(trainee.id, currentEvent.code, e.target.value)}
                              className="w-24 h-8 rounded-xl border border-gray-300 bg-gray-50 px-2 text-xs font-black text-center text-gray-900 outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                            />
                          </div>
                        ) : (
                          /* SDC, PLK, 2MR: Input (w-24) + Action Button (w-20 fixed) = 192px matching right boundary */
                          <div className="flex items-center justify-end gap-1.5 w-full">
                            <div className="relative w-24">
                              <input
                                type="text"
                                placeholder={getMinimumPassingStandard(currentEvent.code, trainee.ageGroup)}
                                value={rawValStr}
                                onChange={(e) => handleScoreChange(trainee.id, currentEvent.code, e.target.value)}
                                onBlur={(e) => {
                                  if (currentEvent.isTime && e.target.value.trim()) {
                                    const formatted = formatTimeInput(e.target.value);
                                    handleScoreChange(trainee.id, currentEvent.code, formatted);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && currentEvent.isTime && rawValStr.trim()) {
                                    const formatted = formatTimeInput(rawValStr);
                                    handleScoreChange(trainee.id, currentEvent.code, formatted);
                                    (e.target as HTMLInputElement).blur();
                                  }
                                }}
                                disabled={isPlkDisabled}
                                className={`w-full h-8 rounded-xl border border-gray-300 bg-gray-50 px-2 text-xs font-black text-center text-gray-900 outline-none focus:border-blue-600 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white ${
                                  isPlkDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                              />
                            </div>

                            {/* Action Area for Time Events (SDC, PLK, 2MR) - Fixed Width w-20 */}
                            {isPLK && !timerRunning ? (
                              /* PLK Before Start: Intuitive Interactive Selection Checkbox */
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  togglePlkSelection(trainee.id);
                                }}
                                className={`h-8 w-20 shrink-0 flex items-center justify-center gap-1 rounded-xl text-[11px] font-black transition-all active:scale-95 border ${
                                  isPlkSelected
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-md'
                                    : 'bg-gray-50 border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:bg-slate-800 dark:border-slate-700 dark:text-gray-400'
                                }`}
                                title={isPlkSelected ? 'Selected for Plank' : 'Click to select for Plank'}
                              >
                                <span>{isPlkSelected ? '☑' : '☐'}</span>
                                <span>{isPlkSelected ? 'READY' : 'SELECT'}</span>
                              </button>
                            ) : (
                              /* SDC / 2MR / PLK Running: Action Button */
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTimerAction(trainee.id, currentEvent.code as 'SDC' | 'PLK' | '2MR');
                                }}
                                disabled={isPlkDisabled}
                                className={`h-8 w-20 shrink-0 flex items-center justify-center gap-1 rounded-xl text-[11px] font-black tracking-wider transition-colors active:scale-95 shadow ${
                                  isSDC
                                    ? isSdcRunning
                                      ? 'bg-amber-500 text-blue-950 animate-pulse ring-1 ring-amber-600'
                                      : 'bg-blue-800 text-white hover:bg-blue-700'
                                    : isPLK
                                      ? isPlkActive
                                        ? 'bg-amber-500 text-blue-950 animate-pulse ring-1 ring-amber-600 cursor-pointer'
                                        : isPlkDisabled
                                          ? 'bg-gray-200 text-gray-400 dark:bg-slate-800 cursor-not-allowed'
                                          : 'bg-blue-800 text-white hover:bg-blue-700'
                                      : 'bg-blue-800 text-white hover:bg-blue-700'
                                }`}
                                title={
                                  isSDC
                                    ? (isSdcRunning ? 'Stop & Record Time' : 'Start SDC Timer')
                                    : isPLK
                                      ? (isPlkActive ? 'Stop & Record PLK' : 'Plank idle')
                                      : 'Tag runner finish time'
                                }
                              >
                                <span>⏱️</span>
                                {isSDC && <span>{isSdcRunning ? 'STOP' : 'START'}</span>}
                                {isPLK && <span>{isPlkActive ? 'STOP' : 'IDLE'}</span>}
                                {currentEvent.code === '2MR' && <span>TAG</span>}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </section>

            </>
          )}

          {/* SUMMARY / RESULT TAB (Full Lane Scorecard) */}
          {isSummaryView && (
            <div className="space-y-3">
              <section className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 p-4 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-black">LANE {selectedLane} SCORECARD</h2>
                    <p className="text-xs text-blue-200">Vest: {currentLaneConfig.vestColor} · 5-Event Results</p>
                  </div>
                </div>
              </section>

              {/* Trainee Summary Cards */}
              <div className="space-y-2.5">
                {currentTrainees.map(trainee => {
                  let total = 0;
                  let eventPassCount = 0;
                  const eventResults = AFT_EVENTS.map(ev => {
                    let rawValStr = trainee.scores[ev.code] || '';
                    let displayRaw = rawValStr;

                    if (ev.code === 'MDL') {
                      const att1Str = (trainee.scores.MDL || '').trim();
                      const att2Str = (trainee.scores.MDL2 || '').trim();
                      const att1 = parseFloat(att1Str) || 0;
                      const att2 = parseFloat(att2Str) || 0;
                      const bestVal = Math.max(att1, att2);
                      
                      if (att1Str && att2Str) {
                        displayRaw = `${att1Str} / ${att2Str}`;
                      } else if (att1Str) {
                        displayRaw = `${att1Str} / -`;
                      } else if (att2Str) {
                        displayRaw = `- / ${att2Str}`;
                      } else {
                        displayRaw = '';
                      }
                      rawValStr = bestVal > 0 ? `${bestVal}` : '';
                    }

                    const val = ev.isTime ? parseTimeToSeconds(rawValStr) : (parseFloat(rawValStr) || 0);
                    const score = rawValStr.trim() !== '' ? calculateAftScore(ev.code, val, trainee.ageGroup) : 0;
                    const passed = score >= 60;
                    if (passed) eventPassCount++;
                    if (rawValStr.trim() !== '') total += score;
                    return { code: ev.code, raw: displayRaw, score, passed, has: rawValStr.trim() !== '' };
                  });

                  const allDone = eventResults.every(e => e.has);
                  const isPassed = allDone && eventPassCount === 5 && total >= 300;

                  return (
                    <div key={trainee.id} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-2">
                          <span 
                            className="flex h-6 w-9 items-center justify-center rounded-md text-xs font-black text-white"
                            style={{ backgroundColor: currentLaneConfig.vestColorCode }}
                          >
                            #{trainee.vestNumber}
                          </span>
                          <span className="text-xs font-black text-gray-500">RN #{trainee.rosterNumber}</span>
                          <span className="text-xs font-black text-gray-900 dark:text-white">{trainee.name}</span>
                          <span className="text-[10px] text-gray-400 font-bold">({trainee.age} yrs)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-blue-900 dark:text-blue-300">{total} / 500</span>
                          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${
                            !allDone ? 'bg-gray-100 text-gray-500' : isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {!allDone ? `${eventResults.filter(e => e.has).length}/5` : isPassed ? 'PASS' : 'FAIL'}
                          </span>
                        </div>
                      </div>

                      {/* 5-Event Score Badges */}
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {eventResults.map(res => (
                          <div key={res.code} className="rounded-lg bg-gray-50 p-1 dark:bg-slate-800">
                            <div className="text-[9px] font-black text-gray-400">{res.code}</div>
                            <div className="text-[11px] font-black text-gray-900 dark:text-white truncate">{res.raw || '-'}</div>
                            <div className={`text-[10px] font-black ${!res.has ? 'text-gray-300' : res.passed ? 'text-green-600' : 'text-red-500'}`}>
                              {res.score}p
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </main>

          {/* Fixed Bottom Event Navigation Bar: MDL -> HRP -> SDC -> PLK -> 2MR -> RESULT */}
          <footer className="sticky bottom-0 z-40 w-full bg-blue-950 border-t border-blue-900 shadow-2xl shrink-0">
            <div className="flex w-full text-xs sm:text-sm font-extrabold">
              {AFT_EVENTS.map((ev, idx) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setCurrentEventIndex(idx)}
                  className={`flex-1 py-3 text-center transition-all border-t-2 active:scale-95 ${
                    currentEventIndex === idx && !isSummaryView
                      ? 'border-amber-400 text-amber-300 bg-blue-900 font-black shadow-inner'
                      : 'border-transparent text-blue-200/80 hover:text-white hover:bg-blue-900/40'
                  }`}
                >
                  {ev.code}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentEventIndex(AFT_EVENTS.length)}
                className={`flex-1 py-3 text-center transition-all border-t-2 active:scale-95 ${
                  isSummaryView
                    ? 'border-amber-400 text-amber-300 bg-blue-900 font-black shadow-inner'
                    : 'border-transparent text-blue-200/80 hover:text-white hover:bg-blue-900/40'
                }`}
              >
                RESULT
              </button>
            </div>
          </footer>
          </>
        )}
      </div>

      {/* EXCEL IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl dark:bg-slate-900 border border-gray-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-black text-gray-900 dark:text-white">Import Trainee Excel</h3>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportStatus(null);
                }}
                className="rounded-full bg-gray-100 p-1 text-gray-400 hover:text-gray-700 dark:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
              Upload an Excel (.xlsx / .xls) or CSV file with the following 3 columns:
              <br />
              <strong>RN</strong> (Roster Number) · <strong>Name</strong> · <strong>Age</strong>
              <br />
              <span className="text-[11px] text-gray-400">
                (Trainees will be automatically distributed across 10 lanes: e.g. 81 soldiers → 9, 8, 8, 8...)
              </span>
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full rounded-2xl bg-blue-900 py-3.5 text-xs font-black text-white shadow-md active:scale-95 hover:bg-blue-800 mb-2 flex items-center justify-center gap-2"
            >
              <span>📁 SELECT EXCEL FILE</span>
            </button>

            {importStatus && (
              <div className="mt-2 text-center text-xs font-bold text-blue-600 dark:text-blue-400">
                {importStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* OFFICIAL 2025 AFT STANDARDS MODAL & SCORE VERIFICATION TOOL */}
      {showStandardsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 sm:p-4">
          <div className="w-full max-w-lg max-h-[85vh] rounded-3xl bg-white p-3.5 sm:p-4 shadow-2xl dark:bg-slate-900 border border-gray-200 dark:border-slate-800 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-800">
              <div>
                <h3 className="text-sm sm:text-base font-black text-blue-950 dark:text-white flex items-center gap-1.5">
                  <span>📜</span>
                  <span>AFT Standards (2025)</span>
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  Approved: 1 May 2025 · Male Standards
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStandardsModal(false)}
                className="rounded-full bg-gray-100 p-1 text-gray-400 hover:text-gray-700 dark:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Event Selector Tabs - Clean Grid for Mobile */}
            <div className="grid grid-cols-5 gap-1 border-b border-gray-200 dark:border-slate-800 pb-2.5 my-2">
              {(['MDL', 'HRP', 'SDC', 'PLK', '2MR'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStandardsEventTab(tab)}
                  className={`py-1.5 text-xs font-black rounded-xl text-center transition-all ${
                    standardsEventTab === tab
                      ? 'bg-blue-900 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Table Content Area (Compact, 17-21, 22-26, 27-31 only) */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-gray-200 dark:border-slate-800">
              <table className="w-full text-center text-xs">
                <thead className="bg-blue-950 text-white sticky top-0 font-black text-[11px]">
                  <tr>
                    <th className="py-2 px-1 border-r border-blue-900 w-24">PTS</th>
                    {(['17-21', '22-26', '27-31'] as const).map(ag => (
                      <th key={ag} className="py-2 px-1 border-r border-blue-900">
                        {ag}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800 font-mono text-xs">
                  {(() => {
                    let tableData: Record<number, Record<AgeGroupKey, number>>;
                    let isTimeFormat = false;

                    switch (standardsEventTab) {
                      case 'MDL':
                        tableData = MDL_MALE_TABLE;
                        break;
                      case 'HRP':
                        tableData = HRP_MALE_TABLE;
                        break;
                      case 'SDC':
                        tableData = SDC_MALE_TABLE;
                        isTimeFormat = true;
                        break;
                      case 'PLK':
                        tableData = PLK_MALE_TABLE;
                        isTimeFormat = true;
                        break;
                      case '2MR':
                        tableData = TWO_MILE_RUN_MALE_TABLE;
                        isTimeFormat = true;
                        break;
                    }

                    const points = Object.keys(tableData).map(Number).sort((a, b) => b - a);
                    const relevantAges: AgeGroupKey[] = ['17-21', '22-26', '27-31'];

                    return points.map(pt => {
                      const isPassing = pt === 60;
                      const isMax = pt === 100;
                      return (
                        <tr
                          key={pt}
                          className={`${
                            isPassing
                              ? 'bg-amber-100 dark:bg-amber-950/50 font-black text-amber-900 dark:text-amber-200'
                              : isMax
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 font-bold text-emerald-900 dark:text-emerald-300'
                                : pt < 60
                                  ? 'bg-red-50/40 dark:bg-red-950/20 text-gray-500 dark:text-gray-400'
                                  : 'hover:bg-gray-50 dark:hover:bg-slate-800/50'
                          }`}
                        >
                          <td className="py-1.5 px-1 font-black border-r border-gray-200 dark:border-slate-800 whitespace-nowrap text-[11px]">
                            {pt} {isPassing ? '⭐(PASS)' : isMax ? '🏆(MAX)' : ''}
                          </td>
                          {relevantAges.map(ag => {
                            const val = tableData[pt]?.[ag];
                            const displayVal = val !== undefined
                              ? isTimeFormat
                                ? formatSecondsToTime(val)
                                : val
                              : '-';
                            return (
                              <td key={ag} className="py-1.5 px-1 border-r border-gray-100 dark:border-slate-800/60 font-semibold">
                                {displayVal}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Verification Footer */}
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 border-t pt-2 dark:border-slate-800">
              <span>* Showing age groups 17-21, 22-26, 27-31.</span>
              <button
                type="button"
                onClick={() => setShowStandardsModal(false)}
                className="rounded-xl bg-blue-900 px-3.5 py-1.5 text-xs font-black text-white active:scale-95 hover:bg-blue-800"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
