// Read-only remote smoke test. Does not print access codes or authentication tokens.
const fs = require('node:fs');
const source = fs.readFileSync('firebase-functions/index.js', 'utf8');
const code = source.match(/const TEST_ACCESS_CODE = '([^']+)'/)?.[1];
const config = fs.readFileSync('src/staging.ts', 'utf8');
const apiKey = config.match(/apiKey: '([^']+)'/)?.[1];
if (!code || !apiKey) throw new Error('Staging test configuration is incomplete.');
const call = async (url, body, idToken) => fetch(url, {
  method: 'POST', headers: { 'Content-Type': 'application/json', ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}) }, body: JSON.stringify(body),
  signal: AbortSignal.timeout(25000)
});
(async () => {
  const functionResponse = await call('https://us-central1-ncoa-calendar-staging.cloudfunctions.net/createAdminSession', { data: { code } });
  const functionPayload = await functionResponse.json().catch(() => null);
  const customToken = functionPayload?.result?.token;
  if (!functionResponse.ok || !customToken || functionPayload?.result?.testMode !== true) {
    throw new Error(`Staging login function failed (HTTP ${functionResponse.status}).`);
  }
  const authResponse = await call(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    token: customToken, returnSecureToken: true
  });
  const authPayload = await authResponse.json().catch(() => null);
  if (!authResponse.ok || !authPayload?.idToken) throw new Error(`Staging token exchange failed (HTTP ${authResponse.status}).`);
  const databaseResponse = await fetch(`https://ncoa-calendar-staging-default-rtdb.firebaseio.com/schedules.json?auth=${encodeURIComponent(authPayload.idToken)}`, {
    cache: 'no-store', signal: AbortSignal.timeout(25000)
  });
  if (!databaseResponse.ok) throw new Error(`Staging database access failed (HTTP ${databaseResponse.status}).`);
  const relayResponse = await call('https://us-central1-ncoa-calendar-staging.cloudfunctions.net/registerPushToken', {
    data: { token: 'synthetic-device-token-for-unapproved-smoke-test', academy: 'BLC' }
  }, authPayload.idToken);
  const relayPayload = await relayResponse.json().catch(() => null);
  if (relayResponse.ok || !/^Approve test device: [a-f0-9]{64}$/.test(relayPayload?.error?.message || '')) {
    throw new Error(`Device-only push relay gate failed (HTTP ${relayResponse.status}).`);
  }
  console.log('Remote smoke test passed: staging login, ID-token exchange, authenticated staging DB read, and rejection of an unapproved device. No data changed or notification sent.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
