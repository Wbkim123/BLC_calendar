// Local read-only prerequisite inspection. Never creates identities or prints credentials.
const path = require('node:path');
async function main() {
  const project = 'blc-calendar-e302f';
  const serviceAccount = `update-announcement-monitor@${project}.iam.gserviceaccount.com`;
  const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
  require(path.join(cli, 'logger')).logger.silent = true;
  const auth = require(path.join(cli, 'auth'));
  const account = auth.getProjectDefaultAccount(process.cwd());
  const access = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const read = async url => {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${access.access_token}` }, signal: AbortSignal.timeout(20000) });
    return { status: response.status, data: response.ok ? await response.json() : null };
  };
  const [metadata, identity] = await Promise.all([
    read(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}`),
    read(`https://iam.googleapis.com/v1/projects/${project}/serviceAccounts/${serviceAccount}`)
  ]);
  const report = { project, dedicatedIdentityStatus: identity.status, dedicatedIdentityExists: identity.status === 200 };
  if (metadata.data?.projectNumber) {
    const pools = await read(`https://iam.googleapis.com/v1/projects/${metadata.data.projectNumber}/locations/global/workloadIdentityPools`);
    report.workloadIdentityPoolsStatus = pools.status;
    report.activePoolCount = pools.data?.workloadIdentityPools?.filter(x => x.state === 'ACTIVE').length || 0;
    report.poolListHasMorePages = Boolean(pools.data?.nextPageToken);
  } else { report.projectMetadataStatus = metadata.status; }
  console.log(JSON.stringify(report));
}
main().catch(() => { console.error('Read-only setup inspection failed; credentials and raw responses withheld.'); process.exitCode = 1; });
