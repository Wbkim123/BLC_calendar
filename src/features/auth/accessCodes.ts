import { TV_ACCESS_CODES } from './tvAccessCodes';
import { DailySchedule } from '../../types/schedule';
import { AccessProfile, AcademyId } from '../../types/academy';

const READ_ONLY: AccessProfile['permissions'] = ['schedule.read'];
const IMPORTER: AccessProfile['permissions'] = [
  'schedule.read',
  'schedule.write',
  'schedule.import',
  'location.manage',
  'conflict.resolve'
];
const NCOA_MANAGER: AccessProfile['permissions'] = [...IMPORTER];

export const normalizeAccessCode = (code: string) =>
  code.replace(/\s+/g, '').toUpperCase();

const cycleFromDigits = (digits: string) => `${digits.slice(0, 2)}-${digits.slice(2)}`;

const isCycleActive = (cycleName: string, schedules: DailySchedule[]) => {
  const cycleSchedules = schedules.filter(schedule => schedule.cycleName === cycleName);
  if (cycleSchedules.length === 0) return false;

  const today = new Date();
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const dates = cycleSchedules.map(schedule => schedule.date).sort();
  return todayString >= dates[0] && todayString <= dates[dates.length - 1];
};

export function resolveAccessCode(
  code: string,
  schedules: DailySchedule[],
  selectedAcademy: AcademyId = 'BLC'
): AccessProfile | null {
  const normalized = normalizeAccessCode(code);

  const tvAcademy = (Object.keys(TV_ACCESS_CODES) as AcademyId[])
    .find(academy => TV_ACCESS_CODES[academy] === normalized);
  if (tvAcademy) {
    return {
      role: 'VIEWER',
      accessLevel: 'TV_DISPLAY',
      academy: tvAcademy,
      scope: tvAcademy,
      permissions: READ_ONLY
    };
  }


  // Released BLC compatibility must be evaluated before the generic four-
  // digit student pattern; otherwise 9876 is mistaken for cycle 98-76.
  if (normalized === '9876') {
    return {
      role: 'VIEWER',
      accessLevel: 'SENIOR',
      academy: 'BLC',
      scope: 'BLC',
      permissions: READ_ONLY
    };
  }

  if (normalized === 'NCOA6120') {
    return {
      role: 'ADMIN',
      accessLevel: 'NCOA_MANAGER',
      academy: selectedAcademy,
      scope: 'NCOA',
      permissions: NCOA_MANAGER,
      requiresServerAuth: true
    };
  }

  const staffMatch = /^(BLC|KTA)(2002|0209)$/.exec(normalized);
  if (staffMatch) {
    const academy = staffMatch[1] as AcademyId;
    const importer = staffMatch[2] === '2002';
    return {
      role: importer ? 'ADMIN' : 'VIEWER',
      accessLevel: importer ? 'SCHEDULE_IMPORTER' : 'SENIOR',
      academy,
      scope: academy,
      permissions: importer ? IMPORTER : READ_ONLY,
      requiresServerAuth: importer
    };
  }

  const studentMatch = /^(BLC|KTA)(\d{4})$/.exec(normalized);
  if (studentMatch) {
    const academy = studentMatch[1] as AcademyId;
    const cycleName = cycleFromDigits(studentMatch[2]);
    if (!isCycleActive(cycleName, schedules)) return null;
    return {
      role: 'STUDENT',
      accessLevel: 'STUDENT',
      academy,
      scope: academy,
      permissions: READ_ONLY,
      studentCycleName: cycleName
    };
  }

  // Backward compatibility for the currently distributed BLC student codes.
  if (/^\d{4}$/.test(normalized)) {
    const cycleName = cycleFromDigits(normalized);
    if (!isCycleActive(cycleName, schedules)) return null;
    return {
      role: 'STUDENT',
      accessLevel: 'STUDENT',
      academy: 'BLC',
      scope: 'BLC',
      permissions: READ_ONLY,
      studentCycleName: cycleName
    };
  }

  return null;
}
