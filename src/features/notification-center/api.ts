import { app, useFirebaseEmulators } from '../../firebase';
import { getAdminIdToken } from '../../notifications';
import { isStagingSession } from '../../staging';
import { AccessProfile } from '../../types/academy';
import { HistoryPage } from './history';

// Keep non-remembered credentials only for the lifetime of this login.
let sessionCredential: string | null = null;
export const setHistoryCredential = (code: string | null) => { sessionCredential = code; };
export function getHistoryCredential() {
  if (sessionCredential) return sessionCredential;
  try {
    const login = JSON.parse(window.localStorage.getItem('blc_calendar_login') || 'null');
    return !login?.testMode && typeof login?.code === 'string' ? login.code : null;
  } catch { return null; }
}

function abortable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Request aborted', 'AbortError'));
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
    operation.then(value => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) abort();
      else resolve(value);
    }, error => {
      signal.removeEventListener('abort', abort);
      reject(error);
    });
  });
}

export async function fetchHistoryPage(profile: AccessProfile, cursor: HistoryPage['nextCursor'], signal: AbortSignal): Promise<HistoryPage> {
  if (signal.aborted) throw new DOMException('Request aborted', 'AbortError');
  // Test-role previews must never query production history or reuse a production credential.
  if (useFirebaseEmulators || isStagingSession()) throw new Error('History is unavailable in test mode.');
  const staff = profile.accessLevel === 'SCHEDULE_IMPORTER' || profile.accessLevel === 'NCOA_MANAGER';
  const idToken = staff ? await abortable(getAdminIdToken(), signal) : null;
  const code = staff ? null : getHistoryCredential();
  if (staff ? !idToken : !code) throw new Error('Please log out and sign in again to view notifications.');
  const response = await fetch(`https://us-central1-${app.options.projectId}.cloudfunctions.net/getNotificationHistory`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ data: { academy: profile.academy, ...(code ? { code } : {}), cursor } })
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.error || !Array.isArray(payload?.result?.items)) {
    if (response.status === 401 || response.status === 403) throw new Error('Please log out and sign in again to view notifications.');
    throw new Error('Notification history is unavailable. Please try again.');
  }
  return payload.result;
}
