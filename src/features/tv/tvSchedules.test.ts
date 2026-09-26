import { describe, expect, it } from '@jest/globals';
import { DailySchedule } from '../../types/schedule';
import { chooseAutoTvSchedule, chooseTvSchedule } from './tvSchedules';

const day = (date: string): DailySchedule => ({ date, cycleName: 'example', dayLabel: 'Training', events: [] });

describe('TV event selection', () => {
  it('automatically changes cycle after the final event, across gaps and at midnight', () => {
    const schedules = [
      { ...day('2026-10-01'), cycleName: 'A' },
      { ...day('2026-10-05'), cycleName: 'B' }
    ];
    const end = new Date('2026-10-01T17:00:00');
    const getEnd = () => end;
    expect(chooseAutoTvSchedule(schedules, '2026-10-01', end.getTime() - 1, getEnd)?.cycleName).toBe('A');
    expect(chooseAutoTvSchedule(schedules, '2026-10-01', end.getTime() + 1, getEnd)?.cycleName).toBe('B');
    expect(chooseAutoTvSchedule(schedules, '2026-10-02', end.getTime() + 1, () => null)?.cycleName).toBe('B');
    expect(chooseAutoTvSchedule([], '2026-10-02', end.getTime(), getEnd)).toBeUndefined();
  });
  it('opens today, or the next scheduled day when today is missing', () => {
    const schedules = [day('2026-10-03'), day('2026-10-01')];
    expect(chooseTvSchedule(schedules, '2026-10-01')?.date).toBe('2026-10-01');
    expect(chooseTvSchedule(schedules, '2026-10-02')?.date).toBe('2026-10-03');
  });

  it('preserves a selected date and supports finished or empty cycles', () => {
    const schedules = [day('2026-10-03'), day('2026-10-01')];
    expect(chooseTvSchedule(schedules, '2026-10-04', '2026-10-01')?.date).toBe('2026-10-01');
    expect(chooseTvSchedule(schedules, '2026-10-04', 'deleted')?.date).toBe('2026-10-03');
    expect(chooseTvSchedule([], '2026-10-04')).toBeUndefined();
  });
});
