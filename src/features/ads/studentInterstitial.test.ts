import { describe, expect, it } from '@jest/globals';
import {
  isStudentInterstitialEligible,
  STUDENT_INTERSTITIAL_COOLDOWN_MS,
  STUDENT_INTERSTITIAL_RETURN_THRESHOLD
} from './studentInterstitial';

describe('student interstitial eligibility', () => {
  const now = 1_000_000;

  it('waits until the third return to the calendar', () => {
    expect(isStudentInterstitialEligible(STUDENT_INTERSTITIAL_RETURN_THRESHOLD - 1, 0, now)).toBe(false);
    expect(isStudentInterstitialEligible(STUDENT_INTERSTITIAL_RETURN_THRESHOLD, 0, now)).toBe(true);
  });

  it('enforces the cooldown after an interstitial is shown', () => {
    expect(isStudentInterstitialEligible(3, now - STUDENT_INTERSTITIAL_COOLDOWN_MS + 1, now)).toBe(false);
    expect(isStudentInterstitialEligible(3, now - STUDENT_INTERSTITIAL_COOLDOWN_MS, now)).toBe(true);
  });
});
