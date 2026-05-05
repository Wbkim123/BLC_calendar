// src/data/mockData.ts
import { DailySchedule } from '../types/schedule';

export const mockSchedules: DailySchedule[] = [
  {
    date: "2026-04-20",
    dayLabel: "DAY 1 (MONDAY)",
    events: [
      { id: "e1", time: "0700-0900", eventName: "INPROCESSING / PACKING LIST INSP", location: "MPR", uniform: "ACU" },
      { id: "e2", time: "0900-1100", eventName: "CLASSROOM ASSIGN / INIT. COUNSELING", location: "CR", uniform: "ACU" },
      { id: "e3", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "e4", time: "1200-1300", eventName: "COMMANDANT INBRIEF", location: "AUD", uniform: "ACU" },
      { id: "e5", time: "1300-1600", eventName: "BLC / BB OVERVIEW", location: "CR", uniform: "ACU" },
      { id: "e6", time: "1600-1630", eventName: "ACADEMY MAINTENANCE", location: "ACA", uniform: "ACU" },
      { id: "e7", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-21",
    dayLabel: "DAY 2 (TUESDAY)",
    events: [
      { id: "e8", time: "0500-0800", eventName: "AFT", location: "FLD", uniform: "PT" },
      { id: "e9", time: "0800-0845", eventName: "BREAKFAST (MERMITES)", location: "ACA", uniform: "PT" },
    ]
  }
];