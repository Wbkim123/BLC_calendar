// src/data/mockData.ts
import { DailySchedule } from '../types/schedule';

export const mockSchedules: DailySchedule[] = [
  // --- WEEK 1 ---
  {
    date: "2026-04-20",
    dayLabel: "PICK-UP DAY (MONDAY)",
    cycleName: "06-26",
    events: [
      { id: "d20-1", time: "0700-0900", eventName: "INPROCESSING / PACKING LIST INSP", location: "MPR", uniform: "ACU" },
      { id: "d20-2", time: "0900-1100", eventName: "CLASSROOM ASSIGN / INIT. COUNSELING", location: "CR", uniform: "ACU" },
      { id: "d20-3", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d20-4", time: "1200-1300", eventName: "COMMANDANT INBRIEF", location: "AUD", uniform: "ACU" },
      { id: "d20-5", time: "1300-1600", eventName: "BLC / BB OVERVIEW", location: "CR", uniform: "ACU" },
      { id: "d20-6", time: "1600-1630", eventName: "ACADEMY MAINTENANCE", location: "ACA", uniform: "ACU" },
      { id: "d20-7", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-21",
    dayLabel: "DAY 1 (TUESDAY)",
    cycleName: "06-26",
    events: [
      { id: "d21-1", time: "0500-0800", eventName: "AFT", location: "FLD", uniform: "PT" },
      { id: "d21-2", time: "0800-0845", eventName: "BREAKFAST (MERMITES)", location: "ACA", uniform: "PT" },
      { id: "d21-3", time: "0845-0930", eventName: "PERSONAL HYGIENE", location: "DFC", uniform: "ACU" },
      { id: "d21-4", time: "0930-1100", eventName: "GROUP DYNAMICS", location: "CR", uniform: "ACU" },
      { id: "d21-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d21-6", time: "1200-1300", eventName: "GROUP DYNAMICS", location: "CR", uniform: "ACU" },
      { id: "d21-7", time: "1300-1630", eventName: "WRITTEN COMMUNICATION", location: "CR", uniform: "ACU" },
      { id: "d21-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "d21-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-22",
    dayLabel: "DAY 2 (WEDNESDAY)",
    cycleName: "06-26",
    events: [
      { id: "d22-1", time: "0530-0540", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "PT" },
      { id: "d22-2", time: "0540-0700", eventName: "D&C DEMONSTRATION / PRACTICE", location: "ACA", uniform: "PT" },
      { id: "d22-3", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "d22-4", time: "0800-1100", eventName: "PRT DEMONSTRATION / PRACTICE", location: "MPR", uniform: "PT" },
      { id: "d22-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "PT" },
      { id: "d22-6", time: "1200-1400", eventName: "SHARP", location: "CR", uniform: "ACU" },
      { id: "d22-7", time: "1400-1630", eventName: "EFFECTIVE LISTENING", location: "CR", uniform: "ACU" },
      { id: "d22-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "d22-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-23",
    dayLabel: "DAY 3 (THURSDAY)",
    cycleName: "06-26",
    events: [
      { id: "d23-1", time: "0545-0700", eventName: "PRT", location: "FLD", uniform: "PT" },
      { id: "d23-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "d23-3", time: "0800-0900", eventName: "PERSONAL HYGIENE", location: "ACA", uniform: "PT" },
      { id: "d23-4", time: "0900-1100", eventName: "CULTURAL COMPETENCIES", location: "CR", uniform: "ACU" },
      { id: "d23-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d23-6", time: "1200-1300", eventName: "CULTURAL COMPETENCIES", location: "CR", uniform: "ACU" },
      { id: "d23-7", time: "1300-1630", eventName: "ARMY LEADERSHIP REQ. MODULE", location: "CR", uniform: "ACU" },
      { id: "d23-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "d23-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-24",
    dayLabel: "DAY 4 (FRIDAY)",
    cycleName: "06-26",
    events: [
      { id: "d24-1", time: "0545-0700", eventName: "PRT", location: "FLD", uniform: "PT" },
      { id: "d24-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "d24-3", time: "0800-0900", eventName: "PERSONAL HYGIENE", location: "ACA", uniform: "PT" },
      { id: "d24-4", time: "0900-1000", eventName: "AGSU / ASU INSPECTION", location: "CR", uniform: "ACU" },
      { id: "d24-5", time: "1000-1100", eventName: "ARMY LEADERSHIP REQ. MODULE", location: "CR", uniform: "ACU" },
      { id: "d24-6", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d24-7", time: "1200-1230", eventName: "ARMY LEADERSHIP REQ. MODULE", location: "CR", uniform: "ACU" },
      { id: "d24-8", time: "1230-1600", eventName: "PUBLIC SPEAKING", location: "CR", uniform: "ACU" },
      { id: "d24-9", time: "1600-1630", eventName: "ACADEMY MAINTENANCE", location: "ACA", uniform: "ACU" },
      { id: "d24-10", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "d24-11", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-25",
    dayLabel: "DAY 5 (SATURDAY)",
    cycleName: "06-26",
    events: [
      { id: "d25-1", time: "0700-0710", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "PT" },
      { id: "d25-2", time: "0710-0800", eventName: "SHOE SHINE", location: "DFC", uniform: "PT" },
      { id: "d25-3", time: "0800-1000", eventName: "PRT PRACTICE / D&C PRACTICE", location: "ACA", uniform: "PT" },
      { id: "d25-4", time: "1000-1100", eventName: "BRUNCH", location: "FLD", uniform: "PT" },
      { id: "d25-5", time: "1100-1500", eventName: "STUDY HALL", location: "CR", uniform: "PT" },
    ]
  },

  // --- WEEK 2 ---
  {
    date: "2026-04-27",
    dayLabel: "DAY 6 (MONDAY)",
    cycleName: "06-26",
    events: [
      { id: "d27-1", time: "0545-0700", eventName: "PRT", location: "FLD", uniform: "PT" },
      { id: "d27-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "d27-3", time: "0800-0900", eventName: "PERSONAL HYGIENE", location: "ACA", uniform: "PT" },
      { id: "d27-4", time: "0900-1100", eventName: "CRITICAL THINKING & PRBLM SLVNG", location: "CR", uniform: "ACU" },
      { id: "d27-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d27-6", time: "1200-1300", eventName: "CRITICAL THINKING & PRBLM SLVNG", location: "CR", uniform: "ACU" },
      { id: "d27-7", time: "1300-1600", eventName: "TRAINING MANAGEMENT", location: "CR", uniform: "ACU" },
      { id: "d27-8", time: "1600-1630", eventName: "ROOM INSPECTIONS", location: "ACA", uniform: "ACU" },
      { id: "d27-9", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "d27-10", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-28",
    dayLabel: "DAY 7 (TUESDAY)",
    cycleName: "06-26",
    events: [
      { id: "d28-1", time: "0545-0700", eventName: "PRT / AFT RE-ASSESSMENT", location: "FLD", uniform: "PT" },
      { id: "d28-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "d28-3", time: "0800-0900", eventName: "PERSONAL HYGIENE", location: "ACA", uniform: "PT" },
      { id: "d28-4", time: "0900-1100", eventName: "RESILIENCY", location: "CR", uniform: "ACU" },
      { id: "d28-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d28-6", time: "1200-1500", eventName: "RESILIENCY", location: "CR", uniform: "ACU" },
      { id: "d28-7", time: "1500-1630", eventName: "ARMY VALUES, ETHICS, & TIMS", location: "CR", uniform: "ACU" },
      { id: "d28-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "d28-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-29",
    dayLabel: "DAY 8 (WEDNESDAY)",
    cycleName: "06-26",
    events: [
      { id: "d29-1", time: "0500-0510", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "PT" },
      { id: "d29-2", time: "0510-0700", eventName: "HEIGHT & WEIGHT", location: "ACA", uniform: "PT" },
      { id: "d29-3", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "d29-4", time: "0800-1100", eventName: "ARMY VALUES, ETHICS, & TIMS", location: "CR", uniform: "ACU" },
      { id: "d29-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d29-6", time: "1200-1300", eventName: "ARMY VALUES, ETHICS, & TIMS", location: "CR", uniform: "ACU" },
      { id: "d29-7", time: "1300-1630", eventName: "LEGAL RESP & LIMITS OF NCO AUTH", location: "CR", uniform: "ACU" },
      { id: "d29-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "m29-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-04-30",
    dayLabel: "DAY 9 (THURSDAY)",
    cycleName: "06-26",
    events: [
      { id: "d30-1", time: "0545-0700", eventName: "D&C PRACTICE", location: "FLD", uniform: "PT" },
      { id: "d30-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "d30-3", time: "0800-1000", eventName: "D&C ASSESSMENTS", location: "ACA", uniform: "ACU" },
      { id: "d30-4", time: "1000-1100", eventName: "FOLLOWERSHIP & SERVANT LDRSHP", location: "CR", uniform: "ACU" },
      { id: "d30-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "d30-6", time: "1200-1630", eventName: "FOLLOWERSHIP & SERVANT LDRSHP", location: "CR", uniform: "ACU" },
      { id: "d30-7", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "d30-8", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-01",
    dayLabel: "DAY 10 (FRIDAY)",
    cycleName: "06-26",
    events: [
      { id: "m1-1", time: "0545-0700", eventName: "PRT", location: "FLD", uniform: "PT" },
      { id: "m1-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "m1-3", time: "0800-0900", eventName: "PERSONAL HYGIENE", location: "ACA", uniform: "PT" },
      { id: "m1-4", time: "0900-1100", eventName: "COHESIVE TM BLDG CONFLICT MNGT", location: "CR", uniform: "ACU" },
      { id: "m1-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "m1-6", time: "1200-1600", eventName: "COHESIVE TM BLDG CONFLICT MNGT", location: "CR", uniform: "ACU" },
      { id: "m1-7", time: "1600-1630", eventName: "ACADEMY MAINT / D&C RE-ASSESS", location: "ACA", uniform: "ACU" },
      { id: "m1-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "m1-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-02",
    dayLabel: "DAY 11 (SATURDAY)",
    cycleName: "06-26",
    events: [
      { id: "m2-1", time: "0700-0710", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "PT" },
      { id: "m2-2", time: "0710-0800", eventName: "SHOE SHINE", location: "MPR", uniform: "PT" },
      { id: "m2-3", time: "0800-1000", eventName: "PRT PRACTICE", location: "FLD", uniform: "PT" },
      { id: "m2-4", time: "1000-1100", eventName: "BRUNCH", location: "DFC", uniform: "PT" },
      { id: "m2-5", time: "1100-1500", eventName: "STUDY HALL", location: "CR", uniform: "PT" },
    ]
  },

  // --- WEEK 3 ---
  {
    date: "2026-05-04",
    dayLabel: "DAY 12 (MONDAY)",
    cycleName: "06-26",
    events: [
      { id: "m4-1", time: "0530-0700", eventName: "PRT ASSESSMENTS", location: "FLD", uniform: "PT" },
      { id: "m4-2", time: "0700-0800", eventName: "BREAKFAST (MERMITES)", location: "ACA", uniform: "PT" },
      { id: "m4-3", time: "0800-1100", eventName: "PRT ASSESSMENTS", location: "FLD", uniform: "PT" },
      { id: "m4-4", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "PT" },
      { id: "m4-5", time: "1200-1300", eventName: "PRT ASSESSMENTS", location: "FLD", uniform: "PT" },
      { id: "m4-6", time: "1300-1500", eventName: "AFT GRADER CERT. (CLASSROOM)", location: "CR", uniform: "PT" },
      { id: "m4-7", time: "1500-1630", eventName: "AFT GRADER CERT. (HANDS-ON)", location: "FLD", uniform: "PT" },
      { id: "m4-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "PT" },
      { id: "m4-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "PT" },
    ]
  },
  {
    date: "2026-05-05",
    dayLabel: "DAY 13 (TUESDAY)",
    cycleName: "06-26",
    events: [
      { id: "m5-1", time: "0640-0700", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "ACU" },
      { id: "m5-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "ACU" },
      { id: "m5-3", time: "0800-1100", eventName: "COUNSELING", location: "CR", uniform: "ACU" },
      { id: "m5-4", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "m5-5", time: "1200-1530", eventName: "COUNSELING", location: "CR", uniform: "ACU" },
      { id: "m5-6", time: "1530-1630", eventName: "C-UAV / PRT RE-ASSESSMENTS", location: "AUD", uniform: "ACU" },
      { id: "m5-7", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "m5-8", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-06",
    dayLabel: "DAY 14 (WEDNESDAY)",
    cycleName: "06-26",
    events: [
      { id: "m6-1", time: "0530-0550", eventName: "HT & WT RE-ASSESS", location: "ACA", uniform: "PT" },
      { id: "m6-2", time: "0550-0600", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "ACU" },
      { id: "m6-3", time: "0600-0700", eventName: "PUBLIC SPEAKING ASSESSMENTS", location: "CR", uniform: "ACU" },
      { id: "m6-4", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "ACU" },
      { id: "m6-5", time: "0800-1100", eventName: "PUBLIC SPEAKING ASSESSMENTS", location: "CR", uniform: "ACU" },
      { id: "m6-6", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "m6-7", time: "1200-1630", eventName: "SOLDIER READINESS", location: "CR", uniform: "ACU" },
      { id: "m6-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "m6-9", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-07",
    dayLabel: "DAY 15 (THURSDAY)",
    cycleName: "06-26",
    events: [
      { id: "m7-1", time: "0600-0610", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "ACU" },
      { id: "m7-2", time: "0610-0700", eventName: "LEADER STAKES PCC'S / PCI'S", location: "HMP", uniform: "ACU" },
      { id: "m7-3", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "ACU" },
      { id: "m7-4", time: "0800-1130", eventName: "LEADER STAKES", location: "HMP", uniform: "ACU" },
      { id: "m7-5", time: "1130-1230", eventName: "LUNCH (MRE) / MOVE TO ACADEMY", location: "HMP", uniform: "ACU" },
      { id: "m7-6", time: "1230-1400", eventName: "TALENT MANAGEMENT", location: "CR", uniform: "ACU" },
      { id: "m7-7", time: "1400-1600", eventName: "HOLISTIC HEALTH AND FITNESS", location: "ACA", uniform: "ACU" },
      { id: "m7-8", time: "1600-1630", eventName: "RM INSP / PUBLIC SPKG RE-ASSESS", location: "ACA", uniform: "ACU" },
      { id: "m7-9", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "m7-10", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-08",
    dayLabel: "DAY 16 (FRIDAY)",
    cycleName: "06-26",
    events: [
      { id: "m8-1", time: "0650-0700", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "ACU" },
      { id: "m8-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "ACU" },
      { id: "m8-3", time: "0800-1100", eventName: "MAP READING & LAND NAVIGATION", location: "CR", uniform: "ACU" },
      { id: "m8-4", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "m8-5", time: "1200-1530", eventName: "MAP READING & LAND NAVIGATION", location: "CR", uniform: "ACU" },
      { id: "m8-6", time: "1530-1600", eventName: "LAND NAV BRIEF", location: "MPR", uniform: "ACU" },
      { id: "m8-7", time: "1600-1900", eventName: "DAY LAND NAV", location: "HMP", uniform: "ACU" },
      { id: "m8-8", time: "1900-1930", eventName: "DINNER (MRE)", location: "MPR", uniform: "ACU" },
      { id: "m8-9", time: "1930-2230", eventName: "NIGHT LAND NAV", location: "HMP", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-09",
    dayLabel: "DAY 17 (SATURDAY)",
    cycleName: "06-26",
    events: [
      { id: "m9-1", time: "0900-0910", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "PT" },
      { id: "m9-2", time: "0910-1000", eventName: "SHOE SHINE / ASU PREP", location: "CR", uniform: "PT" },
      { id: "m9-3", time: "1000-1100", eventName: "BRUNCH", location: "DFC", uniform: "PT" },
      { id: "m9-4", time: "1100-1200", eventName: "ACADEMY MAINTENANCE", location: "ACA", uniform: "PT" },
      { id: "m9-5", time: "1200-1500", eventName: "STUDY HALL", location: "CR", uniform: "PT" },
    ]
  },

  // --- WEEK 4 ---
  {
    date: "2026-05-11",
    dayLabel: "DAY 18 (MONDAY)",
    cycleName: "06-26",
    events: [
      { id: "m11-1", time: "0600-0610", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "ACU" },
      { id: "m11-2", time: "0610-0630", eventName: "WEAPONS DRAW", location: "ACA", uniform: "ACU" },
      { id: "m11-3", time: "0630-0715", eventName: "BREAKFAST (MERMITES)", location: "ACA", uniform: "ACU" },
      { id: "m11-4", time: "0715-1100", eventName: "CIT ASSESSMENTS", location: "FLD", uniform: "ACU" },
      { id: "m11-5", time: "1100-1200", eventName: "LUNCH (MRE)", location: "ACA", uniform: "ACU" },
      { id: "m11-6", time: "1200-1330", eventName: "CIT ASSESSMENTS", location: "FLD", uniform: "ACU" },
      { id: "m11-7", time: "1330-1630", eventName: "NUTRITIONAL READINESS", location: "CR", uniform: "ACU" },
      { id: "m11-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-12",
    dayLabel: "DAY 19 (TUESDAY)",
    cycleName: "06-26",
    events: [
      { id: "m12-1", time: "0530-0700", eventName: "COMMANDANT'S CUP", location: "FLD", uniform: "PT" },
      { id: "m12-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "m12-3", time: "0800-1100", eventName: "MISSION ORDERS & TLPS", location: "CR", uniform: "ACU" },
      { id: "m12-4", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "m12-5", time: "1200-1430", eventName: "MISSION ORDERS & TLPS", location: "CR", uniform: "ACU" },
      { id: "m12-6", time: "1430-1630", eventName: "ARMY BODY COMPOSITION PRGM", location: "CR", uniform: "ACU" },
      { id: "m12-7", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
      { id: "m12-8", time: "1730-1830", eventName: "STUDY HALL", location: "CR", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-13",
    dayLabel: "DAY 20 (WEDNESDAY)",
    cycleName: "06-26",
    events: [
      { id: "m13-1", time: "0640-0700", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "PT" },
      { id: "m13-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "m13-3", time: "0800-0900", eventName: "IG BRIEF", location: "AUD", uniform: "ACU" },
      { id: "m13-4", time: "0900-1000", eventName: "SOF BRIEF", location: "AUD", uniform: "ACU" },
      { id: "m13-5", time: "1000-1100", eventName: "RED CROSS BRIEF", location: "AUD", uniform: "ACU" },
      { id: "m13-6", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "m13-7", time: "1200-1300", eventName: "FINANCIAL READINESS", location: "AUD", uniform: "ACU" },
      { id: "m13-8", time: "1300-1400", eventName: "GUEST SPEAKER MENTOR BRIEF", location: "AUD", uniform: "ACU" },
      { id: "m13-9", time: "1400-1500", eventName: "EOC AAR", location: "AUD", uniform: "ACU" },
      { id: "m13-10", time: "1500-1630", eventName: "AGSU / ASU INSPECTION", location: "FLD", uniform: "ACU" },
      { id: "m13-11", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-14",
    dayLabel: "DAY 21 (THURSDAY)",
    cycleName: "06-26",
    events: [
      { id: "m14-1", time: "0530-0700", eventName: "COMMANDANT'S TIME", location: "FLD", uniform: "PT" },
      { id: "m14-2", time: "0700-0800", eventName: "BREAKFAST", location: "DFC", uniform: "PT" },
      { id: "m14-3", time: "0800-0900", eventName: "GRADUATION REHEARSAL", location: "AUD", uniform: "ACU" },
      { id: "m14-4", time: "0900-1100", eventName: "GRADUATION REHEARSAL", location: "AUD", uniform: "ACU" },
      { id: "m14-5", time: "1100-1200", eventName: "LUNCH", location: "DFC", uniform: "ACU" },
      { id: "m14-6", time: "1200-1430", eventName: "GRADUATION REHEARSAL", location: "AUD", uniform: "ACU" },
      { id: "m14-7", time: "1430-1630", eventName: "ADMIN CLOSEOUT / 1059 FINALIZE", location: "CR", uniform: "ACU" },
      { id: "m14-8", time: "1630-1730", eventName: "DINNER", location: "DFC", uniform: "ACU" },
    ]
  },
  {
    date: "2026-05-15",
    dayLabel: "DAY 22 (FRIDAY)",
    cycleName: "06-26",
    events: [
      { id: "m15-1", time: "0530-0540", eventName: "ACCOUNTABILITY FORMATION", location: "FLD", uniform: "PT" },
      { id: "m15-2", time: "0540-0700", eventName: "LINEN TURN-IN/RM CLRNG/OUTPRO", location: "ACA", uniform: "PT" },
      { id: "m15-3", time: "0700-0745", eventName: "BREAKFAST (MERMITES)", location: "ACA", uniform: "PT" },
      { id: "m15-4", time: "0745-0845", eventName: "CHANGE INTO AGSU / ASU", location: "ACA", uniform: "ASU" },
      { id: "m15-5", time: "0845-1000", eventName: "GRADUATION REHEARSAL", location: "AUD", uniform: "ASU" },
      { id: "m15-6", time: "1000-1100", eventName: "GRADUATION CEREMONY", location: "AUD", uniform: "ASU" },
    ]
  }
];