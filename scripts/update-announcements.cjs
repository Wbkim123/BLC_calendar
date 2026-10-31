// Scoped release announcement maintenance. Default is read-only; publication is explicit.
const fs = require('node:fs');
const path = require('node:path');
const PROJECT = 'blc-calendar-e302f';
const TARGETS = { android: '4.1.1', ios: '2.0.3' }; // Production confirmed by owner, 2026-10-31.

function compareVersions(a, b) {
  const parse = value => {
    if (typeof value !== 'string' || !/^\d+(\.\d+){0,3}$/.test(value)) throw new Error('Invalid release version');
    const parts = value.split('.').map(Number);
    if (!parts.every(Number.isSafeInteger)) throw new Error('Invalid release version');
    return parts;
  };
  const left = parse(a), right = parse(b);
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if ((left[i] || 0) !== (right[i] || 0)) return Math.sign((left[i] || 0) - (right[i] || 0));
  }
  return 0;
}

function prepare(template, targets = TARGETS) {
  const next = structuredClone(template);
  delete next.version; // Server-managed metadata is not a publish input.
  const changes = [];
  for (const [platform, version] of Object.entries(targets)) {
    if (!['android', 'ios'].includes(platform)) throw new Error('Unknown platform');
    const key = `app_update_${platform}`;
    const parameter = next.parameters?.[key];
    if (!parameter?.defaultValue?.value) throw new Error(`Missing ${key}`);
    if (Object.keys(parameter.conditionalValues || {}).length) throw new Error(`Review conditional overrides for ${key}`);
    const release = JSON.parse(parameter.defaultValue.value);
    if (release.enabled !== true) throw new Error(`Review disabled announcement ${key}`);
    const order = compareVersions(version, release.latestVersion);
    if (order < 0) throw new Error(`Refusing announcement downgrade for ${key}`);
    if (order === 0) continue;
    changes.push({ parameter: key, from: release.latestVersion, to: version });
    parameter.defaultValue.value = JSON.stringify({ ...release, latestVersion: version });
  }
  return { template: next, changes };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some(arg => !['--check', '--validate', '--publish'].includes(arg))) {
    throw new Error('Use --check (default), --validate, or --publish');
  }
  const mode = args[0] || '--check';
  // Reuse the existing local diagnostic authentication convention. No credentials are logged.
  const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
  require(path.join(cli, 'logger')).logger.silent = true;
  const auth = require(path.join(cli, 'auth'));
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login required');
  const access = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const endpoint = `https://firebaseremoteconfig.googleapis.com/v1/projects/${PROJECT}/remoteConfig`;
  const headers = { Authorization: `Bearer ${access.access_token}`, 'Content-Type': 'application/json' };
  const request = async (url, options = {}) => {
    const response = await fetch(url, { ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Remote Config HTTP ${response.status}`);
    return response;
  };
  const original = await request(endpoint);
  const etag = original.headers.get('etag');
  if (!etag) throw new Error('Remote Config ETag missing');
  const current = await original.json();
  const prepared = prepare(current);
  console.log(JSON.stringify({ project: PROJECT, mode, changes: prepared.changes }));
  if (!prepared.changes.length || mode === '--check') return;
  const body = JSON.stringify(prepared.template);
  await request(`${endpoint}?validate_only=true`, { method: 'PUT', headers: { 'If-Match': etag }, body });
  console.log('Server validation passed; no configuration published.');
  if (mode !== '--publish') return;
  const backupDir = path.join(__dirname, '..', '.firebase', 'update-announcement-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  fs.writeFileSync(path.join(backupDir, `${Date.now()}.json`), JSON.stringify({ etag, template: current }, null, 2), { flag: 'wx' });
  // Never force an ETag or retry a write: concurrent edits must be reviewed.
  await request(endpoint, { method: 'PUT', headers: { 'If-Match': etag }, body });
  const verified = await (await request(endpoint)).json();
  if (prepare(verified).changes.length) throw new Error('Publication readback mismatch');
  console.log('Published and verified both announcement versions.');
}

module.exports = { prepare, compareVersions };
if (require.main === module) main().catch(() => {
  console.error('Announcement operation failed; remote state may require a read-only recheck. Sensitive details withheld.');
  process.exitCode = 1;
});
