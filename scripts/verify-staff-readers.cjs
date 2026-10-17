// Read-only production endpoint diagnostics. Never print credentials or returned schedule/history data.
const fs = require('node:fs');
const source = fs.readFileSync('src/features/auth/accessCodes.ts', 'utf8');
const managerCode = source.match(/normalized === '(NCOA\d+)'/)?.[1];
const chiefSuffix = source.match(/const importer = staffMatch\[2\] === '(\d+)'/)?.[1];
const { scopedSeniorCode } = require('../firebase-functions/notificationReaderConfig.json');
const apiKey = fs.readFileSync('src/notifications.ts', 'utf8').match(/PRODUCTION_FIREBASE_API_KEY = '([^']+)'/)?.[1];
const base = 'https://us-central1-blc-calendar-e302f.cloudfunctions.net';
const claims = token => {
  const value = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString());
  return { admin: value.admin === true, manager: value.ncoaManager === true, scope: value.scope || null, project: value.aud };
};
async function post(url, body, token) {
  const response = await fetch(url, { method: 'POST', headers: {
    'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {})
  }, body: JSON.stringify(body), signal: AbortSignal.timeout(30000) });
  const data = await response.json();
  return { status: response.status, data };
}
(async () => {
  if (!managerCode || !chiefSuffix || !apiKey) throw new Error('Missing diagnostic configuration');
  for (const role of process.argv.includes('--sgl-only') ? ['sgl'] : ['manager', 'chief', 'sgl']) {
    for (const academy of ['BLC', 'KTA']) {
      const code = role === 'manager' ? managerCode : `${academy}${role === 'chief' ? chiefSuffix : scopedSeniorCode}`;
      let token;
      if (role !== 'sgl') {
        const session = await post(`${base}/createAdminSession`, { data: { code } });
        if (!session.data.result?.token) { console.log(JSON.stringify({ role, academy, stage: 'session', status: session.status })); continue; }
        const auth = await post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
          { token: session.data.result.token, returnSecureToken: true });
        token = auth.data.idToken;
        if (!token) { console.log(JSON.stringify({ role, academy, stage: 'exchange', status: auth.status })); continue; }
        console.log(JSON.stringify({ role, academy, stage: 'claims', ...claims(token) }));
      }
      for (const endpoint of ['getCrossAcademyConflictNotices', 'getNotificationHistory']) {
        const result = await post(`${base}/${endpoint}`, { data: { academy, dates: ['2026-10-20'], ...(role === 'sgl' ? { code } : {}) } }, token);
        console.log(JSON.stringify({ role, academy, endpoint, status: result.status, error: result.data.error?.status,
          count: (result.data.result?.notices || result.data.result?.items)?.length }));
      }
    }
  }
})().catch(() => { console.error('Staff reader verification failed; no sensitive response logged.'); process.exitCode = 1; });
