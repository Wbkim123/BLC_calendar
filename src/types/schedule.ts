// src/types/schedule.ts

export interface TrainingEvent {
  id: string;
  time: string;
  /** Optional source-facing time text, while `time` remains numeric for calculations. */
  displayTime?: string;
  eventName: string;
  location: string;
  uniform: string;
  highlighted?: boolean;
}

export interface DailySchedule {
  academy?: 'BLC' | 'KTA';
  date: string;
  dayLabel: string;
  cycleName: string;
  notes?: string;
  notesHighlighted?: boolean;
  sglNotes?: string;
  sglNotesHighlighted?: boolean;
  /** KTA Chief-managed conflict dismissals shared through the schedule database. */
  dismissedConflictKeys?: string[];
  events: TrainingEvent[];
}

export type UserRole = 'ADMIN' | 'VIEWER' | 'STUDENT' | null;
