import { describe, expect, it } from '@jest/globals';
import { resolveAccessCode } from './accessCodes';
import { DailySchedule } from '../../types/schedule';

const today = new Date();
const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const schedules: DailySchedule[] = [{
  academy: 'BLC',
  date,
  dayLabel: 'TEST',
  cycleName: '08-26',
  events: []
}];

describe('resolveAccessCode', () => {
  it('normalizes the NCOA manager code', () => {
    const result = resolveAccessCode('ncoa6120', schedules);
    expect(result).toMatchObject({ role: 'ADMIN', scope: 'NCOA', accessLevel: 'NCOA_MANAGER' });
  });

  it('scopes BLC and KTA importers', () => {
    expect(resolveAccessCode('blc2002', schedules)).toMatchObject({ role: 'ADMIN', scope: 'BLC' });
    expect(resolveAccessCode('KTA2002', schedules)).toMatchObject({ role: 'ADMIN', scope: 'KTA' });
  });

  it('makes senior codes read-only', () => {
    const result = resolveAccessCode('BlC0209', schedules);
    expect(result).toMatchObject({ role: 'VIEWER', scope: 'BLC', accessLevel: 'SENIOR' });
    expect(result?.permissions).toEqual(['schedule.read']);
  });

  it('preserves the released 9876 BLC SGL code', () => {
    expect(resolveAccessCode('9876', schedules)).toMatchObject({
      role: 'VIEWER',
      academy: 'BLC',
      scope: 'BLC'
    });
  });

  it('maps an academy student code to its active cycle', () => {
    expect(resolveAccessCode('BLC0826', schedules)).toMatchObject({
      role: 'STUDENT',
      academy: 'BLC',
      studentCycleName: '08-26'
    });
  });

  it('rejects an inactive student cycle', () => {
    expect(resolveAccessCode('BLC0726', schedules)).toBeNull();
  });
});
