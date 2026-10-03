import { describe, expect, it } from '@jest/globals';
import { activeBLCStudentCycles, createTestAccessProfile, getTestNotificationTargets } from './testAccessProfiles';
import { DailySchedule } from '../../types/schedule';

const schedules: DailySchedule[] = [
  { academy: 'BLC', date: '2026-10-01', cycleName: '10-26', dayLabel: 'A', events: [] },
  { academy: 'BLC', date: '2026-10-04', cycleName: '10-26', dayLabel: 'B', events: [] },
  { academy: 'BLC', date: '2026-09-01', cycleName: '09-26', dayLabel: 'C', events: [] },
  { academy: 'KTA', date: '2026-10-04', cycleName: 'KTA-10', dayLabel: 'D', events: [] }
];

describe('test access profile simulator', () => {
  it('offers only currently active BLC student cycles', () => {
    expect(activeBLCStudentCycles(schedules, '2026-10-04')).toEqual(['10-26']);
  });

  it('keeps commander read-only across both academies', () => {
    expect(createTestAccessProfile('commander', 'BLC', [])).toMatchObject({
      role: 'VIEWER', accessLevel: 'NCOA_MANAGER', scope: 'NCOA',
      permissions: ['schedule.read', 'conflict.resolve']
    });
  });

  it('gives chiefs edit tools only in their own academy', () => {
    expect(createTestAccessProfile('kta-chief', 'BLC', [])).toMatchObject({
      role: 'ADMIN', accessLevel: 'SCHEDULE_IMPORTER', academy: 'KTA', scope: 'KTA'
    });
  });

  it('keeps student preview BLC-only and cycle-scoped', () => {
    expect(createTestAccessProfile('blc-student:10-26', 'KTA', ['10-26'])).toMatchObject({
      role: 'STUDENT', academy: 'BLC', scope: 'BLC', studentCycleName: '10-26', permissions: ['schedule.read']
    });
    expect(createTestAccessProfile('blc-student:09-26', 'BLC', ['10-26'])).toBeNull();
  });

  it('builds notification test targets for each role without broadening the recipient scope', () => {
    expect(getTestNotificationTargets('commander').map(target => target.academy)).toEqual(['BLC', 'KTA']);
    expect(getTestNotificationTargets('blc-chief')).toMatchObject([{ academy: 'BLC' }]);
    expect(getTestNotificationTargets('kta-sgl')).toMatchObject([{ academy: 'KTA' }]);
    expect(getTestNotificationTargets('blc-student:10-26')).toMatchObject([
      { academy: 'BLC', cycleName: '10-26' }
    ]);
    expect(getTestNotificationTargets('blc-tv')).toEqual([]);
  });
});
