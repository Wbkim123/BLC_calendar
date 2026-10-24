import { getDatabaseRestUrl } from '../../firebase';
import { getAdminIdToken } from '../../notifications';
import { getSessionGeneration, isStagingSession, stagingDatabaseUrl } from '../../staging';

export const requestNativeDatabaseWrite = async (
  path: string,
  method: 'PATCH' | 'PUT' | 'DELETE',
  value?: unknown
) => {
  const staging = isStagingSession();
  const generation = getSessionGeneration();
  const assertSession = () => {
    if (generation !== getSessionGeneration()) throw new Error('Session changed.');
  };
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  for (let attempt = 0; attempt < 2; attempt++) {
    const idToken = await getAdminIdToken(attempt > 0);
    assertSession();
    if (!idToken) throw new Error('Administrator authentication is required. Sign out and sign in again.');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(staging ? stagingDatabaseUrl(normalizedPath, idToken) : getDatabaseRestUrl(normalizedPath, idToken), {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method === 'DELETE' ? undefined : JSON.stringify(value),
        signal: controller.signal
      });
      assertSession();
      if (response.status === 401 || response.status === 403) {
        // Retry only an explicitly rejected write, never an ambiguous timeout.
        if (attempt === 0 && !staging) continue;
        throw new Error('Your session cannot edit this academy. Sign out, then sign in with your academy Chief account and try again.');
      }
      if (!response.ok) throw new Error(`Database update failed (${response.status}). Please try again.`);
      window.dispatchEvent(new Event(staging ? 'staging-data-changed' : 'schedule-write-confirmed'));
      return;
    } catch (error) {
      if (controller.signal.aborted || error instanceof TypeError) {
        assertSession();
        window.dispatchEvent(new Event(staging ? 'staging-data-changed' : 'schedule-write-uncertain'));
        throw new Error('Could not confirm whether the change was saved. Check the refreshed schedule before trying again.');
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
};
