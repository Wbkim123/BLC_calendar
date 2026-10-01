// One-time baseline copy: six schedule/configuration nodes only, never users or tokens.
// Every staging destination must be empty; source paths are explicitly academy-scoped.
const fs = require('node:fs');
const source = fs.readFileSync('firebase-functions/index.js', 'utf8');
const code = source.match(/const TEST_ACCESS_CODE = '([^']+)'/)?.[1];
const config = fs.readFileSync('src/staging.ts', 'utf8');
const apiKey = config.match(/apiKey: '([^']+)'/)?.[1];
if (!code || !apiKey) throw new Error('Staging test configuration is incomplete.');
const production = 'https://blc-calendar-e302f-default-rtdb.firebaseio.com';
const staging = 'https://ncoa-calendar-staging-default-rtdb.firebaseio.com';
const paths = ['schedules', 'locations', 'uniforms', 'academies/kta/schedules', 'academies/kta/locations', 'academies/kta/uniforms'];
const getJson = async url => {
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Database read failed (HTTP ${response.status}).`);
  return response.json();
};
(async () => {
  const login = await fetch('https://us-central1-ncoa-calendar-staging.cloudfunctions.net/createAdminSession', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { code } }),
    signal: AbortSignal.timeout(25000)
  });
  const loginData = await login.json().catch(() => null);
  if (!login.ok || !loginData?.result?.token) throw new Error(`Staging login failed (HTTP ${login.status}).`);
  const auth = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: loginData.result.token, returnSecureToken: true }),
    signal: AbortSignal.timeout(25000)
  });
  const credentials = await auth.json().catch(() => null);
  if (!auth.ok || !credentials?.idToken) throw new Error(`Staging authentication failed (HTTP ${auth.status}).`);
  const destinations = await Promise.all(paths.map(async path => [path, await getJson(`${staging}/${path}.json?auth=${encodeURIComponent(credentials.idToken)}`)]));
  if (destinations.some(([, value]) => value !== null)) throw new Error('Staging already contains data. Nothing was overwritten.');
  const snapshots = await Promise.all(paths.map(async path => [path, await getJson(`${production}/${path}.json`)]));
  try {
    for (const [path, value] of snapshots) {
      const response = await fetch(`${staging}/${path}.json?auth=${encodeURIComponent(credentials.idToken)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) throw new Error(`Staging write failed (HTTP ${response.status}).`);
    }
  } catch (error) {
    // All six paths were confirmed empty before copying; rollback only those exact destinations.
    await Promise.all(paths.map(path => fetch(`${staging}/${path}.json?auth=${encodeURIComponent(credentials.idToken)}`, {
      method: 'DELETE', signal: AbortSignal.timeout(15000)
    }).catch(() => undefined)));
    throw error;
  }
  const counts = snapshots.map(([path, value]) => `${path}: ${value == null ? 0 : Array.isArray(value) ? value.length : Object.keys(value).length}`);
  console.log(`Copied six BLC/KTA schedule/configuration nodes to staging. Counts: ${counts.join('; ')}. No users, credentials, or device tokens copied.`);
})().catch(error => { console.error(error.message); process.exitCode = 1; });
