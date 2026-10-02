import { describe, expect, it } from '@jest/globals';
import { DailySchedule } from '../types/schedule';
import { getScheduleConflicts } from '../features/schedule-conflicts/conflicts';
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

  it('returns exact conflict pairs and ignores UTC marker events without a known end', () => {
    const first = event('briefing', '0900-1100', 'ROOM A');
    const second = event('training', '1000-1200', 'ROOM B');
    const utc = { ...event('open-ended', '0800-0800', 'TBD'), displayTime: '0800-UTC' };
    expect(getScheduleConflicts(day('KTA', [utc, first, second]))).toMatchObject([
      { first, second, kind: 'time' }
    ]);
  });

  it('flags commander cross-academy location conflicts only at AUD or MPR when times overlap', () => {
    const blc = day('BLC', [event('blc', '0900-1100', 'MPR')]);
    expect(hasCrossAcademyLocationConflict(blc, [day('KTA', [event('kta', '1000-1200', 'MPR')])])).toBe(true);
    expect(hasCrossAcademyLocationConflict(day('BLC', [event('blc', '0900-1100', 'AUD')]), [
      day('KTA', [event('kta', '1000-1200', 'AUDITORIUM')])
    ])).toBe(true);
    expect(hasCrossAcademyLocationConflict(day('BLC', [event('blc', '0900-1100', 'GYM')]), [
      day('KTA', [event('kta', '1000-1200', 'GYM')])
    ])).toBe(false);
    expect(hasCrossAcademyLocationConflict(blc, [day('KTA', [event('kta', '1100-1200', 'MPR')])])).toBe(false);
    expect(hasCrossAcademyLocationConflict(blc, [day('KTA', [event('kta', '1000-1200', 'TBD')])])).toBe(false);
  });
});
