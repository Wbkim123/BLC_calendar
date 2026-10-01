const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

initializeApp();
const accessCode = defineSecret('STAGING_ACCESS_CODE');
const projectId = 'ncoa-calendar-staging';
const options = { region: 'us-central1', maxInstances: 2 };
const assertProject = () => {
  if (process.env.GCLOUD_PROJECT !== projectId || process.env.FUNCTIONS_EMULATOR === 'true') {
    throw new HttpsError('failed-precondition', 'This endpoint requires the remote staging project.');
  }
};

exports.createAdminSession = onCall({ ...options, secrets: [accessCode] }, async request => {
  assertProject();
  const code = typeof request.data?.code === 'string' ? request.data.code.trim() : '';
  if (!code || code !== accessCode.value().trim()) {
    throw new HttpsError('permission-denied', 'Invalid test login.');
  }
  const token = await getAuth().createCustomToken('ncoa-staging-manager', {
    admin: true, staging: true, scope: 'NCOA'
  });
  return { token, testMode: true, scope: 'NCOA' };
});

const relay = async (request, kind) => {
  assertProject();
  if (request.auth?.token?.staging !== true || request.auth?.token?.admin !== true ||
      request.auth?.uid !== 'ncoa-staging-manager') {
    throw new HttpsError('permission-denied', 'Staging authentication is required.');
  }
  const authorization = request.rawRequest.headers.authorization || '';
  const idToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!idToken) throw new HttpsError('unauthenticated', 'Staging authentication is required.');
  // The relay verifies this staging ID token independently, and permits only
  // an explicitly approved device token. No production DB access is granted.
  const response = await fetch('https://us-central1-blc-calendar-e302f.cloudfunctions.net/relayStagingNotification', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: { ...request.data, kind, stagingIdToken: idToken } }),
    signal: AbortSignal.timeout(10000)
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || result?.error || !result?.result) {
    // Only relay validation errors are surfaced; never include tokens or raw responses.
    const message = result?.error?.message;
    const approval = typeof message === 'string' && /^Approve test device: [a-f0-9]{64}$/.test(message);
    throw new HttpsError('failed-precondition', approval ? message : 'Test notification relay is unavailable or this device is not approved.');
  }
  return result.result;
};
exports.registerPushToken = onCall(options, request => relay(request, 'welcome'));
exports.sendTestScheduleNotification = onCall(options, request => relay(request, 'schedule'));
// Even a client accidentally calling the audience endpoint can only target the approved device.
exports.sendScheduleNotification = onCall(options, request => relay(request, 'schedule'));
exports.unregisterPushToken = onCall(options, async () => ({ subscribed: false, topic: null }));
