export type StorePlatform = 'ios' | 'android';
export interface UpdateRelease { latestVersion: string; notes: string; }
export const STORE_URLS: Record<StorePlatform, string> = {
  ios: 'https://apps.apple.com/app/id6790968637',
  android: 'https://play.google.com/store/apps/details?id=dev.pages.blccalendar'
};
export const REMIND_AFTER_MS = 24 * 60 * 60 * 1000;
const parts = (version: string): number[] | null => {
  if (!/^\d+(\.\d+){0,3}$/.test(version)) return null;
  const values = version.split('.').map(Number);
  return values.every(Number.isSafeInteger) ? values : null;
};
export function isNewerVersion(latest: string, installed: string): boolean {
  const a = parts(latest), b = parts(installed);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) !== (b[i] || 0)) return (a[i] || 0) > (b[i] || 0);
  }
  return false;
}
export function parseRelease(raw: string, installed: string): UpdateRelease | null {
  try {
    const value = JSON.parse(raw);
    if (value?.enabled !== true || typeof value.latestVersion !== 'string'
      || !isNewerVersion(value.latestVersion, installed)) return null;
    return { latestVersion: value.latestVersion, notes: typeof value.notes === 'string' ? value.notes.slice(0, 1000) : '' };
  } catch { return null; }
}
export function shouldRemind(lastDismissed: number, now = Date.now()): boolean {
  return !Number.isFinite(lastDismissed) || lastDismissed <= 0 || now - lastDismissed >= REMIND_AFTER_MS;
}
export const dismissalKey = (platform: StorePlatform, version: string) => `app-update-dismissed:${platform}:${version}`;
