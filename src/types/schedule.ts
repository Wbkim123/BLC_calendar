// src/types/schedule.ts

// 개별 이벤트 (훈련/일정) 타입
export interface TrainingEvent {
  id: string;        // 고유 ID (수정을 위해 필요)
  time: string;      // 예: "0700-0900"
  eventName: string; // 예: "INPROCESSING / PACKING LIST INSP"
  location: string;  // 예: "MPR"
  uniform: string;   // 예: "ACU"
}

// 하루 전체의 일정 타입
export interface DailySchedule {
  date: string;      // 예: "2026-04-20"
  dayLabel: string;  // 예: "DAY 1"
  cycleName: string; // 예: "06-26"
  events: TrainingEvent[];
}

// 사용자 권한 타입
export type UserRole = 'ADMIN' | 'VIEWER' | null;