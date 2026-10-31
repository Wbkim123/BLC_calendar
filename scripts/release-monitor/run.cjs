const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { PACKAGE, APPLE_ID, fail, countries, iosCandidate, androidCandidate, versionMap, announcementPlan } = require('./policy.cjs');
const ROOT = path.resolve(__dirname, '../..');
const PROJECT = 'blc-calendar-e302f';
const PLAY = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE}`;
const RC = `https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT}/remoteConfig`;

function http(fetchImpl = fetch, token = '') {
  return async (url, { method = 'GET', body, etag, authenticated = false } = {}) => {
    if (authenticated && !token) fail('GOOGLE_TOKEN_MISSING');
    const headers = { Accept: 'application/json' };
    if (authenticated) headers.Authorization = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (etag) headers['If-Match'] = etag;
    let response;
    try {
      response = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20000), redirect: 'error' });
    } catch { fail('NETWORK_OR_TIMEOUT'); }
    if (!response.ok) fail(`HTTP_${response.status}`);
    let data;
    try { data = response.status === 204 ? null : await response.json(); } catch { fail('INVALID_JSON_RESPONSE'); }
    return { data, etag: response.headers.get('etag') };
  };
}
async function readIos(request, requiredCountries) {
  const results = await Promise.all(requiredCountries.map(async country => {
    const result = await request(`https://itunes.apple.com/lookup?id=${APPLE_ID}&country=${country.toLowerCase()}&entity=software`);
    return result.data;
  }));
  return iosCandidate(results);
}
async function readAndroid(request, requiredCountries, mapping) {
  const published = (await request(`${PLAY}/tracks/production/releases`, { authenticated: true })).data;
  // Play's track/country APIs require a disposable uncommitted edit. Dedicated identity only.
  const edit = (await request(`${PLAY}/edits`, { method: 'POST', body: {}, authenticated: true })).data;
  if (!edit?.id || !/^[A-Za-z0-9_-]+$/.test(edit.id)) fail('INVALID_PLAY_EDIT');
  const base = `${PLAY}/edits/${edit.id}`;
  try {
    const [track, availability] = await Promise.all([
      request(`${base}/tracks/production`, { authenticated: true }),
      request(`${base}/countryAvailability/production`, { authenticated: true })
    ]);
    return androidCandidate(track.data, availability.data, published, mapping, requiredCountries);
  } finally {
    // No upload/update/commit endpoint is used. Cleanup failure stops publication.
    await request(base, { method: 'DELETE', authenticated: true });
  }
}
function readVersionMap() {
  const commits = execFileSync('git', ['log', '--format=%H', '--', 'android/app/build.gradle'], { cwd: ROOT, encoding: 'utf8' }).trim().split(/\s+/).filter(Boolean);
  if (!commits.length || commits.some(x => !/^[a-f0-9]{40}$/.test(x))) fail('GIT_HISTORY_REQUIRED');
  const sources = commits.map(commit => execFileSync('git', ['show', `${commit}:android/app/build.gradle`], { cwd: ROOT, encoding: 'utf8' }));
  return versionMap(sources);
}
async function sync({ request, candidates, publish = false, backup = () => {} }) {
  const original = await request(RC, { authenticated: true });
  if (!original.etag) fail('ETAG_MISSING');
  const plan = announcementPlan(original.data, candidates);
  const result = { decisions: plan.decisions, changes: plan.changes, published: false };
  if (!plan.changes.length) return result;
  await request(`${RC}?validate_only=true`, { method: 'PUT', body: plan.template, etag: original.etag, authenticated: true });
  if (!publish) return result;
  await backup({ etag: original.etag, template: original.data });
  await request(RC, { method: 'PUT', body: plan.template, etag: original.etag, authenticated: true });
  const verified = (await request(RC, { authenticated: true })).data;
  for (const change of plan.changes) {
    if (verified.parameters?.[change.parameter]?.defaultValue?.value !== plan.template.parameters[change.parameter].defaultValue.value) fail('PUBLISH_READBACK_MISMATCH');
  }
  return { ...result, published: true };
}
async function main() {
  const args = process.argv.slice(2);
  if (args.some(x => !['--check', '--publish', '--ios-only', '--stores-only'].includes(x)) || (args.includes('--check') && args.includes('--publish')) || (args.includes('--stores-only') && args.includes('--publish'))) fail('INVALID_ARGUMENTS');
  const requiredCountries = countries(process.env.UPDATE_COUNTRIES || 'US,KR');
  const platforms = args.includes('--ios-only') ? ['ios'] : ['ios', 'android'];
  const request = http(fetch, process.env.GOOGLE_OAUTH_ACCESS_TOKEN);
  const candidates = {};
  // Both readers must succeed before any Remote Config write is attempted.
  for (const platform of platforms) {
    try { candidates[platform] = platform === 'ios' ? await readIos(request, requiredCountries) : await readAndroid(request, requiredCountries, readVersionMap()); }
    catch (error) { fail(`${platform.toUpperCase()}_${error.code || 'CHECK_FAILED'}`); }
  }
  if (args.includes('--stores-only')) { console.log(JSON.stringify({ countries: requiredCountries, candidates })); return; }
  const result = await sync({ request, candidates, publish: args.includes('--publish'), backup: data => {
    const dir = path.join(ROOT, '.firebase', 'update-announcement-backups');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${Date.now()}.json`), JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 });
  } });
  const summary = JSON.stringify({ project: PROJECT, countries: requiredCountries, ...result });
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Update release monitor\n\n\`\`\`json\n${summary}\n\`\`\`\n`);
}
module.exports = { http, readIos, readAndroid, readVersionMap, sync, RC, PLAY };
if (require.main === module) main().catch(error => {
  const code = /^[A-Z0-9_]+$/.test(error.code || '') ? error.code : 'RELEASE_MONITOR_FAILED';
  console.error(`Release monitor failed: ${code}. No automatic retry of writes; inspect current configuration before rerunning.`);
  process.exitCode = 1;
});
