// Run only through Firebase emulators:exec. Never connects to a remote project.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const functionsRequire = require('node:module').createRequire(require('node:path').resolve('firebase-functions/package.json'));
const { initializeApp } = functionsRequire('firebase-admin/app');
const { getAuth } = functionsRequire('firebase-admin/auth');
const dbHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (dbHost !== '127.0.0.1:9000' || authHost !== '127.0.0.1:9099') {
  throw new Error('Only the local loopback emulator is permitted.');
}
const projectId = 'demo-blc-calendar';
initializeApp({ projectId });
const base = `http://${dbHost}`;
const rules = JSON.parse(fs.readFileSync('database.rules.staging.json', 'utf8'));
const request = (path, method, body, token) => fetch(`${base}/${path}.json?ns=${projectId}${token ? `&auth=${encodeURIComponent(token)}` : ''}`, {
  method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body)
});
const installRules = body => fetch(`${base}/.settings/rules.json?ns=${projectId}`, {
  method: 'PUT', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify(body)
});
const login = async claims => {
  const user = await getAuth().createUser({ email: `test-${Date.now()}-${Math.random().toString(16).slice(2)}@example.invalid`, password: 'emulator-only-password' });
  await getAuth().setCustomUserClaims(user.uid, claims);
  const result = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: 'emulator-only-password', returnSecureToken: true })
  }).then(response => response.json());
  assert.ok(result.idToken);
  return result.idToken;
};
(async () => {
  assert.equal((await installRules(rules)).status, 200);
  const staging = await login({ staging: true, admin: true, scope: 'NCOA' });
  const normalAdmin = await login({ admin: true, scope: 'NCOA' });
  const student = await login({ staging: true, scope: 'BLC' });
  try {
    for (const path of ['schedules', 'locations', 'uniforms', 'academies/kta/schedules', 'academies/kta/locations', 'academies/kta/uniforms']) {
      assert.equal((await request(path, 'PUT', { fixture: true }, staging)).status, 200, path);
      assert.equal((await request(path, 'GET', undefined, staging)).status, 200, path);
      for (const invalid of [undefined, normalAdmin, student]) {
        assert.equal((await request(path, 'GET', undefined, invalid)).status, 401, path);
        assert.equal((await request(path, 'PUT', {}, invalid)).status, 401, path);
      }
    }
    assert.equal((await request('unrelated', 'PUT', { fixture: true }, staging)).status, 401);
    assert.equal((await request('', 'PUT', {}, staging)).status, 401);
    assert.equal((await request('', 'PATCH', { 'schedules/fixture': false, 'academies/kta/schedules/fixture': false }, staging)).status, 200);
    console.log('Staging rules passed: authenticated paths, anonymous/admin/student rejection, root protection, multi-path updates.');
  } finally {
    await installRules(JSON.parse(fs.readFileSync('database.rules.emulator.json', 'utf8')));
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
