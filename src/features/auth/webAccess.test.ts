import { describe, expect, it } from '@jest/globals';
import { AccessProfile, AccessLevel } from '../../types/academy';
import { canUseWebsite } from './webAccess';
import { resolveAccessCode } from './accessCodes';
import { TV_ACCESS_CODES } from './tvAccessCodes';

const profile = (accessLevel: AccessLevel): AccessProfile => ({
  accessLevel,
  role: accessLevel === 'NCOA_MANAGER' || accessLevel === 'SCHEDULE_IMPORTER' ? 'ADMIN' : 'VIEWER',
  academy: 'BLC',
  scope: accessLevel === 'NCOA_MANAGER' ? 'NCOA' : 'BLC',
  permissions: ['schedule.read']
});

describe('website access', () => {
  it('allows only the owner and academy TV profiles', () => {
    expect(canUseWebsite(profile('NCOA_MANAGER'))).toBe(true);
    expect(canUseWebsite(profile('TV_DISPLAY'))).toBe(true);
    expect(canUseWebsite(profile('SCHEDULE_IMPORTER'))).toBe(false);
    expect(canUseWebsite(profile('SENIOR'))).toBe(false);
    expect(canUseWebsite(profile('STUDENT'))).toBe(false);
    expect(canUseWebsite(null)).toBe(false);
  });

  it('rejects TV profiles that cross academy boundaries', () => {
    expect(canUseWebsite({ ...profile('TV_DISPLAY'), scope: 'KTA' })).toBe(false);
    expect(canUseWebsite({ ...profile('TV_DISPLAY'), scope: 'NCOA' })).toBe(false);
  });

  it('resolves separate read-only TV credentials even without an active cycle', () => {
    for (const academy of ['BLC', 'KTA'] as const) {
      const resolved = resolveAccessCode(TV_ACCESS_CODES[academy].toLowerCase(), [], academy === 'BLC' ? 'KTA' : 'BLC');
      expect(resolved).toEqual({
        accessLevel: 'TV_DISPLAY', role: 'VIEWER', academy, scope: academy, permissions: ['schedule.read']
      });
      expect(canUseWebsite(resolved)).toBe(true);
    }
  });
});
