import type { AcademyId } from '../../types/academy';

export type CrossAcademyConflictNotice = {
  date: string;
  eventId: string;
  location: string;
  otherAcademy: AcademyId;
};

export type CrossAcademyConflictCheckStatus = 'idle' | 'checking' | 'ready' | 'unavailable';
