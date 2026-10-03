import { AccessProfile, AcademyId } from '../../types/academy';
import { DailySchedule } from '../../types/schedule';

export type TestViewId =
  | 'test-manager'
  | 'commander'
  | 'blc-chief'
  | 'kta-chief'
  | 'blc-sgl'
  | 'kta-sgl'
  | 'blc-tv'
  | 'kta-tv'
  | `blc-student:${string}`;

export interface TestNotificationTarget {
  academy: AcademyId;
  cycleName?: string;
  audienceLabel: string;
}

export const getTestNotificationTargets = (view: TestViewId): TestNotificationTarget[] => {
  if (view === 'commander' || view === 'test-manager') {
    return [
      { academy: 'BLC', audienceLabel: 'BLC schedule updates' },
      { academy: 'KTA', audienceLabel: 'KTA schedule updates' }
    ];
  }
  if (view === 'blc-chief' || view === 'blc-sgl') {
    return [{ academy: 'BLC', audienceLabel: 'BLC schedule updates' }];
  }
  if (view === 'kta-chief' || view === 'kta-sgl') {
    return [{ academy: 'KTA', audienceLabel: 'KTA schedule updates' }];
  }
  if (view.startsWith('blc-student:')) {
    const cycleName = view.slice('blc-student:'.length);
    return [{ academy: 'BLC', cycleName, audienceLabel: `BLC Cycle ${cycleName}` }];
  }
  return [];
};

const READ_ONLY: AccessProfile['permissions'] = ['schedule.read'];
const CHIEF: AccessProfile['permissions'] = [
  'schedule.read', 'schedule.write', 'schedule.import', 'location.manage', 'conflict.resolve'
];
const COMMANDER: AccessProfile['permissions'] = ['schedule.read', 'conflict.resolve'];
const TEST_MANAGER: AccessProfile['permissions'] = [
  'schedule.read', 'schedule.write', 'schedule.import', 'location.manage', 'conflict.resolve'
];

export const activeBLCStudentCycles = (schedules: DailySchedule[], today = formatLocalDate(new Date())) => {
  const cycleRanges = new Map<string, { first: string; last: string }>();
  schedules.filter(day => !day.academy || day.academy === 'BLC').forEach(day => {
    const name = day.cycleName?.trim();
    if (!name || !day.date) return;
    const range = cycleRanges.get(name);
    if (!range) cycleRanges.set(name, { first: day.date, last: day.date });
    else {
      if (day.date < range.first) range.first = day.date;
      if (day.date > range.last) range.last = day.date;
    }
  });
  return Array.from(cycleRanges)
    .filter(([, range]) => today >= range.first && today <= range.last)
    .map(([name]) => name)
    .sort();
};

const formatLocalDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const createTestAccessProfile = (
  view: TestViewId,
  currentAcademy: AcademyId,
  activeStudentCycles: string[]
): AccessProfile | null => {
  if (view === 'test-manager') {
    return { role: 'ADMIN', accessLevel: 'NCOA_MANAGER', academy: currentAcademy, scope: 'NCOA', permissions: [...TEST_MANAGER] };
  }
  if (view === 'commander') {
    return { role: 'VIEWER', accessLevel: 'NCOA_MANAGER', academy: currentAcademy, scope: 'NCOA', permissions: [...COMMANDER] };
  }
  if (view === 'blc-chief' || view === 'kta-chief') {
    const academy: AcademyId = view === 'blc-chief' ? 'BLC' : 'KTA';
    return { role: 'ADMIN', accessLevel: 'SCHEDULE_IMPORTER', academy, scope: academy, permissions: [...CHIEF] };
  }
  if (view === 'blc-sgl' || view === 'kta-sgl') {
    const academy: AcademyId = view === 'blc-sgl' ? 'BLC' : 'KTA';
    return { role: 'VIEWER', accessLevel: 'SENIOR', academy, scope: academy, permissions: [...READ_ONLY] };
  }
  if (view === 'blc-tv' || view === 'kta-tv') {
    const academy: AcademyId = view === 'blc-tv' ? 'BLC' : 'KTA';
    return { role: 'VIEWER', accessLevel: 'TV_DISPLAY', academy, scope: academy, permissions: [...READ_ONLY] };
  }
  if (view.startsWith('blc-student:')) {
    const studentCycleName = view.slice('blc-student:'.length);
    if (!activeStudentCycles.includes(studentCycleName)) return null;
    return {
      role: 'STUDENT', accessLevel: 'STUDENT', academy: 'BLC', scope: 'BLC',
      permissions: [...READ_ONLY], studentCycleName
    };
  }
  return null;
};

export const getTestViewOptions = (activeStudentCycles: string[]) => [
  { id: 'test-manager' as const, label: 'Test administrator — full staging controls' },
  { id: 'commander' as const, label: 'Commander — BLC + KTA' },
  { id: 'blc-chief' as const, label: 'BLC chief' },
  { id: 'kta-chief' as const, label: 'KTA chief' },
  { id: 'blc-sgl' as const, label: 'BLC SGL' },
  { id: 'kta-sgl' as const, label: 'KTA SGL' },
  ...activeStudentCycles.map(cycle => ({ id: `blc-student:${cycle}` as TestViewId, label: `BLC student — Cycle ${cycle}` })),
  { id: 'blc-tv' as const, label: 'BLC TV display' },
  { id: 'kta-tv' as const, label: 'KTA TV display' }
];
