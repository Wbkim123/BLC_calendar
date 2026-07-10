// src/types/schedule.ts

export interface TrainingEvent {
  id: string;
  time: string;
  eventName: string;
  location: string;
  uniform: string;
  highlighted?: boolean;
}

export interface DailySchedule {
  date: string;
  dayLabel: string;
  cycleName: string;
  notes?: string;
  notesHighlighted?: boolean;
  sglNotes?: string;
  sglNotesHighlighted?: boolean;
  events: TrainingEvent[];
}

export type UserRole = 'ADMIN' | 'VIEWER' | 'STUDENT' | null;
