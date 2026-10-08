export const notificationEnableError = (error: { code?: string; message?: string; name?: string }, platform: string) => {
  const message = error?.message || '';
  const failure = `${error?.code || ''} ${message}`.toLowerCase();
  if (/^Approve test device: [a-f0-9]{64}$/.test(message)) return message;
  if (message === 'denied') {
    const settings = platform === 'ios' ? 'iPhone Settings' : platform === 'android' ? 'Android Settings' : 'your browser settings';
    return `Permission is blocked. Allow notifications in ${settings}, then tap again.`;
  }
  if (failure.includes('billing')) return 'The notification server has a billing problem. Contact the app administrator and try again later.';
  if (/permission-denied|unauthenticated|http-401|http-403/.test(failure)) return 'The notification server denied registration. Sign out, sign in again, and retry.';
  if (/token-timeout|firebase.*initializ|default firebaseapp|default_firebase_app/.test(failure)) return 'Could not register this device with Firebase. Restart the app and check that the latest app update is installed.';
  if (/timeout|unavailable|http-503|internal|http-500/.test(failure) || error?.name === 'AbortError') return 'The notification server is temporarily unavailable. Try again shortly. You can close this message and continue using the app.';
  return 'Could not enable notifications. Check your connection and try again.';
};
