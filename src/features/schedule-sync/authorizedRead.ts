import { app, useFirebaseEmulators } from '../../firebase';
import { AccessProfile, AcademyId } from '../../types/academy';
import { DailySchedule } from '../../types/schedule';
import { isStagingSession, stagingConfig } from '../../staging';

// Enable only after the matching endpoint is deployed and verified in isolation.
export const secureScheduleReads = process.env.REACT_APP_SECURE_SCHEDULE_READS === 'true';
// Preserve the existing all-environments flag; this additional flag affects only staging.
export const secureStagingScheduleReads = secureScheduleReads
  || process.env.REACT_APP_STAGING_SECURE_SCHEDULE_READS === 'true';
export interface AuthorizedSchedules {
  profile: AccessProfile;
  schedules: Record<string, DailySchedule>;
  locations: Record<string, string> | string[];
  uniforms: Record<string, string> | string[];
}

export async function fetchAuthorizedSchedules(code: string | null, academy: AcademyId, signal: AbortSignal): Promise<AuthorizedSchedules> {
  if (!code || useFirebaseEmulators) throw new Error('Please sign in again.');
  const response = await fetch(`https://us-central1-${app.options.projectId}.cloudfunctions.net/getAuthorizedSchedules`, {
    method: 'POST', signal, cache: 'no-store',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { code, academy } })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error || !payload?.result?.profile || !payload.result.schedules) {
    throw new Error(response.status === 401 || response.status === 403
      ? 'Your access has expired. Please sign out and sign in again.'
      : 'Unable to load schedules. Please try again.');
  }
  return payload.result;
}

export async function fetchAuthorizedStagingSchedules(profile: AccessProfile, token: string, signal: AbortSignal): Promise<AuthorizedSchedules> {
  if (!isStagingSession() || !token || useFirebaseEmulators) throw new Error('Staging session required.');
  const response = await fetch(`https://us-central1-${stagingConfig.projectId}.cloudfunctions.net/getAuthorizedSchedules`, {
    method: 'POST', signal, cache: 'no-store',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: {
      academy: profile.academy, accessLevel: profile.accessLevel,
      ...(profile.studentCycleName ? { studentCycleName: profile.studentCycleName } : {})
    } })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error || !payload?.result?.schedules) throw new Error('Unable to verify test schedule access.');
  return payload.result;
}
