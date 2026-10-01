import { describe, expect, it } from '@jest/globals';
import { DailySchedule } from '../types/schedule';
import { hasCrossAcademyLocationConflict, hasScheduleConflict } from './Calendar';

const day = (academy: 'BLC' | 'KTA', events: DailySchedule['events']): DailySchedule => ({
  academy,
  date: '2026-10-01',
  dayLabel: 'TEST',
  cycleName: '10-26',
  events
});

const event = (id: string, time: string, location: string) => ({
  id, time, displayTime: time, eventName: id, location, uniform: ''
});

describe('schedule conflict rules', () => {
  it('flags overlapping event times inside either academy regardless of location', () => {
    expect(hasScheduleConflict(day('BLC', [event('a', '0900-1100', 'ROOM A'), event('b', '1000-1200', 'ROOM B')]))).toBe(true);
    expect(hasScheduleConflict(day('KTA', [event('a', '0900-1100', 'ROOM A'), event('b', '1000-1200', 'ROOM B')]))).toBe(true);
  });

  it('flags commander cross-academy conflicts only when location and time overlap', () => {
    const blc = day('BLC', [event('blc', '0900-1100', 'GYM')]);
    expect(hasCrossAcademyLocationConflict(blc, [day('KTA', [event('kta', '1000-1200', 'gym')])])).toBe(true);
    expect(hasCrossAcademyLocationConflict(blc, [day('KTA', [event('kta', '1100-1200', 'GYM')])])).toBe(false);
    expect(hasCrossAcademyLocationConflict(blc, [day('KTA', [event('kta', '1000-1200', 'FIELD')])])).toBe(false);
    expect(hasCrossAcademyLocationConflict(blc, [day('KTA', [event('kta', '1000-1200', 'TBD')])])).toBe(false);
  });
});
