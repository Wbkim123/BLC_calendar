// Local diagnostic only: use existing caller permissions, never grant impersonation or create keys.
const path = require('node:path');
const { http, readIos, readAndroid, readVersionMap, sync } = require('./run.cjs');
async function main() {
  const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
  require(path.join(cli, 'logger')).logger.silent = true;
  const auth = require(path.join(cli, 'auth'));
  const account = auth.getProjectDefaultAccount(process.cwd());
  const caller = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const identity = 'update-announcement-monitor@blc-calendar-e302f.iam.gserviceaccount.com';
  const response = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${identity}:generateAccessToken`, {
    method: 'POST', headers: { Authorization: `Bearer ${caller.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ scope: ['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/androidpublisher'], lifetime: '600s' }),
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`SERVICE_ACCOUNT_IMPERSONATION_HTTP_${response.status}`);
  const credentials = await response.json();
  if (!credentials.accessToken) throw new Error('SERVICE_ACCOUNT_TOKEN_MISSING');
  const baseRequest = http(fetch, credentials.accessToken);
  const request = async (url, options) => {
    try { return await baseRequest(url, options); }
    catch (error) {
      const stage = url.includes('/tracks/production/releases') ? 'PLAY_RELEASES'
        : url.endsWith('/edits') ? 'PLAY_TEMP_EDIT_CREATE'
        : options?.method === 'DELETE' ? 'PLAY_TEMP_EDIT_DELETE'
        : url.includes('countryAvailability') ? 'PLAY_COUNTRIES'
        : url.includes('/tracks/production') ? 'PLAY_TRACK'
        : url.includes('itunes.apple.com') ? 'APPLE_PUBLIC_LOOKUP' : 'REMOTE_CONFIG';
      throw new Error(`${stage}_${error.code || 'CHECK_FAILED'}`);
    }
  };
  const requiredCountries = ['US', 'KR'];
  const android = await readAndroid(request, requiredCountries, readVersionMap());
  const ios = await readIos(request, requiredCountries);
  const result = await sync({ request, candidates: { android, ios }, publish: false });
  console.log(JSON.stringify({ dedicatedIdentity: true, candidates: { android, ios }, ...result }));
}
main().catch(error => {
  console.error(/^[A-Z0-9_]+$/.test(error.message || '') ? error.message : 'PLAY_ACCESS_CHECK_FAILED_DETAILS_WITHHELD');
  process.exitCode = 1;
});
