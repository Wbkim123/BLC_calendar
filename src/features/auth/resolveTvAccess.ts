import { AccessProfile, AcademyId } from '../../types/academy';
import { TV_ACCESS_CODES } from './tvAccessCodes';

export const resolveTvAccess = (code: string): AccessProfile | null => {
  const normalized = code.replace(/\s+/g, '').toUpperCase();
  const academy = (Object.keys(TV_ACCESS_CODES) as AcademyId[])
    .find(value => TV_ACCESS_CODES[value] === normalized);
  return academy ? {
    role: 'VIEWER', accessLevel: 'TV_DISPLAY', academy, scope: academy, permissions: ['schedule.read']
  } : null;
};
