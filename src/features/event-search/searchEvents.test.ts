import { describe, expect, it } from '@jest/globals';
import { DailySchedule } from '../../types/schedule';
import { searchEvents } from './searchEvents';

const schedules: DailySchedule[] = [
  {
    academy: 'BLC', date: '2026-08-01', dayLabel: 'DAY 1', cycleName: '09-26',
    events: [{ id: 'blc-current', time: '0800-0900', eventName: 'WTT BLC', location: 'MPR', uniform: 'ACU' }]
  },
  {
    date: '2026-06-01', dayLabel: 'DAY 2', cycleName: '07-26',
    events: [{ id: 'blc-legacy', time: '0900-1000', eventName: 'WTT LEGACY BLC', location: 'AUD', uniform: 'ACU' }]
  },
  {
    academy: 'KTA', date: '2026-08-02', dayLabel: 'DAY 2', cycleName: '09-26',
    events: [{ id: 'kta-current', time: '0700-0800', eventName: 'WTT KTA', location: 'RM 1157', uniform: 'KIM / PARK' }]
  }
];

describe('searchEvents access boundaries', () => {
  it('never mixes BLC and KTA results', () => {
    expect(searchEvents({ schedules, academy: 'BLC', query: 'WTT', scope: 'ALL_CYCLES' }).map(result => result.event.id))
      .toEqual(['blc-legacy', 'blc-current']);
    expect(searchEvents({ schedules, academy: 'KTA', query: 'wtt', scope: 'ALL_CYCLES' }).map(result => result.event.id))
      .toEqual(['kta-current']);
  });

  it('limits current-cycle searches before matching event names', () => {
    expect(searchEvents({
      schedules,
      academy: 'BLC',
      query: 'WTT',
      scope: 'CURRENT_CYCLE',
      currentCycleName: '09-26'
    }).map(result => result.event.id)).toEqual(['blc-current']);
  });
});
