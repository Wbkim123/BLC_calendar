// Approved one-time setup. Additive IAM updates with ETags; never creates private keys.
const fs = require('node:fs');
const path = require('node:path');
const PROJECT = 'blc-calendar-e302f';
const ACCOUNT = 'update-announcement-monitor';
const EMAIL = `${ACCOUNT}@${PROJECT}.iam.gserviceaccount.com`;
const POOL = 'update-announcements';
const PROVIDER = 'github';
const CONDITION = "assertion.repository_id == '1229431110' && assertion.repository_owner_id == '145992262' && assertion.ref == 'refs/heads/master' && assertion.workflow_ref == 'Wbkim123/BLC_calendar/.github/workflows/update-announcements.yml@refs/heads/master'";
const MAPPING = { 'google.subject': 'assertion.sub', 'attribute.repository_id': 'assertion.repository_id' };

function addBinding(original, role, member) {
  const policy = structuredClone(original);
  policy.bindings ||= [];
  const existing = policy.bindings.find(x => x.role === role && !x.condition);
  if (existing?.members?.includes(member)) return { policy, changed: false };
  if (existing) existing.members = [...(existing.members || []), member];
  else policy.bindings.push({ role, members: [member] });
  return { policy, changed: true };
}
function verifyProvider(provider) {
  if (provider.state !== 'ACTIVE' || provider.disabled === true || provider.oidc?.issuerUri !== 'https://token.actions.githubusercontent.com'
    || provider.attributeCondition !== CONDITION || Object.keys(provider.attributeMapping || {}).length !== Object.keys(MAPPING).length
    || Object.entries(MAPPING).some(([key, value]) => provider.attributeMapping[key] !== value)
    || (provider.oidc.allowedAudiences || []).length) throw new Error('PROVIDER_CONFIGURATION_MISMATCH');
}
async function main() {
  const mode = process.argv[2] || '--check';
  if (process.argv.length > 3 || !['--check', '--apply'].includes(mode)) throw new Error('INVALID_MODE');
  const apply = mode === '--apply';
  const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
  require(path.join(cli, 'logger')).logger.silent = true;
  const auth = require(path.join(cli, 'auth'));
  const account = auth.getProjectDefaultAccount(process.cwd());
  const access = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  async function call(label, url, { method = 'GET', body, missing = false } = {}) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${access.access_token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000) });
    if (missing && response.status === 404) return null;
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const status = /^[A-Z_]+$/.test(data.error?.status || '') ? data.error.status : 'ERROR';
      const constraints = JSON.stringify(data.error || {}).match(/constraints\/[a-zA-Z0-9_.]+/g) || [];
      throw new Error(`${label}_HTTP_${response.status}_${status}${constraints.length ? `_${[...new Set(constraints)].join(',')}` : ''}`);
    }
    return response.status === 204 ? null : response.json();
  }
  async function operation(label, origin, value) {
    for (let i = 0; i < 30; i++) {
      if (value.done) {
        if (value.error) throw new Error(`${label}_OPERATION_FAILED_${value.error.code}`);
        return value.response;
      }
      if (!value.name || !/^[A-Za-z0-9_./-]+$/.test(value.name)) throw new Error('INVALID_OPERATION_NAME');
      await new Promise(resolve => setTimeout(resolve, 2000));
      value = await call(label, `${origin}/v1/${value.name}`);
    }
    throw new Error(`${label}_OPERATION_PENDING_RECHECK`);
  }
  const metadata = await call('PROJECT', `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}`);
  const number = metadata.projectNumber;
  if (!/^\d+$/.test(number)) throw new Error('PROJECT_NUMBER_MISSING');
  const parent = `projects/${number}/locations/global`;
  const poolName = `${parent}/workloadIdentityPools/${POOL}`;
  const providerName = `${poolName}/providers/${PROVIDER}`;
  const saUrl = `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts/${EMAIL}`;
  const poolUrl = `https://iam.googleapis.com/v1/${poolName}`;
  const providerUrl = `https://iam.googleapis.com/v1/${providerName}`;
  const projectPolicyUrl = `https://cloudresourcemanager.googleapis.com/v1/projects/${PROJECT}`;
  const principal = `principalSet://iam.googleapis.com/${poolName}/attribute.repository_id/1229431110`;
  // Preflight reads before any mutation.
  let [identity, pool, provider, projectPolicy] = await Promise.all([
    call('ACCOUNT', saUrl, { missing: true }), call('POOL', poolUrl, { missing: true }), call('PROVIDER', providerUrl, { missing: true }),
    call('PROJECT_POLICY', `${projectPolicyUrl}:getIamPolicy`, { method: 'POST', body: { options: { requestedPolicyVersion: 3 } } })
  ]);
  if (identity?.disabled) throw new Error('ACCOUNT_DISABLED_REVIEW_REQUIRED');
  if (pool && (pool.disabled || pool.state !== 'ACTIVE')) throw new Error('POOL_INACTIVE_REVIEW_REQUIRED');
  if (provider) verifyProvider(provider);
  const services = ['iamcredentials.googleapis.com', 'sts.googleapis.com', 'androidpublisher.googleapis.com'];
  const serviceStates = await Promise.all(services.map(async name => {
    const service = await call('SERVICE', `https://serviceusage.googleapis.com/v1/projects/${number}/services/${name}`);
    return { name, enabled: service.state === 'ENABLED' };
  }));
  console.log(JSON.stringify({ mode, project: PROJECT, accountExists: Boolean(identity), poolExists: Boolean(pool), providerExists: Boolean(provider), services: serviceStates }));
  if (!apply) return;
  const backupDir = path.join(__dirname, '../../.firebase/update-monitor-setup');
  fs.mkdirSync(backupDir, { recursive: true });
  const backup = (label, data) => fs.writeFileSync(path.join(backupDir, `${Date.now()}-${label}.json`), JSON.stringify(data, null, 2), { flag: 'wx', mode: 0o600 });
  for (const service of serviceStates.filter(x => !x.enabled)) {
    const op = await call('ENABLE_SERVICE', `https://serviceusage.googleapis.com/v1/projects/${number}/services/${service.name}:enable`, { method: 'POST', body: {} });
    await operation('ENABLE_SERVICE', 'https://serviceusage.googleapis.com', op);
    console.log(`Enabled ${service.name}`);
  }
  if (!identity) {
    identity = await call('CREATE_ACCOUNT', `https://iam.googleapis.com/v1/projects/${PROJECT}/serviceAccounts`, { method: 'POST', body: {
      accountId: ACCOUNT, serviceAccount: { displayName: 'Update announcement monitor', description: 'Dedicated GitHub release monitor; no private keys or app publishing.' }
    } });
    console.log('Created dedicated service account.');
  }
  if (!pool) {
    const op = await call('CREATE_POOL', `https://iam.googleapis.com/v1/${parent}/workloadIdentityPools?workloadIdentityPoolId=${POOL}`, { method: 'POST', body: { displayName: 'Update announcements', description: 'Dedicated trust for the production release monitor.' } });
    await operation('CREATE_POOL', 'https://iam.googleapis.com', op);
    console.log('Created dedicated identity pool.');
  }
  if (!provider) {
    const op = await call('CREATE_PROVIDER', `${poolUrl}/providers?workloadIdentityPoolProviderId=${PROVIDER}`, { method: 'POST', body: {
      displayName: 'GitHub monitor', oidc: { issuerUri: 'https://token.actions.githubusercontent.com' }, attributeMapping: MAPPING, attributeCondition: CONDITION
    } });
    await operation('CREATE_PROVIDER', 'https://iam.googleapis.com', op);
    console.log('Created repository/owner/branch/workflow-restricted provider.');
  }
  // Read current policies immediately before additive writes; preserve version, ETag, audit config and conditions.
  projectPolicy = await call('PROJECT_POLICY', `${projectPolicyUrl}:getIamPolicy`, { method: 'POST', body: { options: { requestedPolicyVersion: 3 } } });
  if (!projectPolicy.etag) throw new Error('PROJECT_POLICY_ETAG_MISSING');
  const updated = addBinding(projectPolicy, 'roles/cloudconfig.admin', `serviceAccount:${EMAIL}`);
  if (updated.changed) {
    backup('project-policy', projectPolicy);
    await call('SET_PROJECT_POLICY', `${projectPolicyUrl}:setIamPolicy`, { method: 'POST', body: { policy: updated.policy } });
    console.log('Granted Remote Config Admin to the dedicated identity.');
  }
  const accountPolicy = await call('ACCOUNT_POLICY', `${saUrl}:getIamPolicy?options.requestedPolicyVersion=3`, { method: 'POST' });
  const linked = addBinding(accountPolicy, 'roles/iam.workloadIdentityUser', principal);
  if (linked.changed) {
    backup('account-policy', accountPolicy);
    await call('SET_ACCOUNT_POLICY', `${saUrl}:setIamPolicy`, { method: 'POST', body: { policy: linked.policy } });
    console.log('Granted the restricted pool permission to use only the monitor identity.');
  }
  const [finalProvider, finalProjectPolicy, finalAccountPolicy, finalIdentity, finalPool] = await Promise.all([
    call('VERIFY_PROVIDER', providerUrl),
    call('VERIFY_PROJECT_POLICY', `${projectPolicyUrl}:getIamPolicy`, { method: 'POST', body: { options: { requestedPolicyVersion: 3 } } }),
    call('VERIFY_ACCOUNT_POLICY', `${saUrl}:getIamPolicy?options.requestedPolicyVersion=3`, { method: 'POST' }),
    call('VERIFY_ACCOUNT', saUrl), call('VERIFY_POOL', poolUrl)
  ]);
  verifyProvider(finalProvider);
  if (finalIdentity.disabled || finalPool.disabled || finalPool.state !== 'ACTIVE'
    || addBinding(finalProjectPolicy, 'roles/cloudconfig.admin', `serviceAccount:${EMAIL}`).changed
    || addBinding(finalAccountPolicy, 'roles/iam.workloadIdentityUser', principal).changed) throw new Error('READBACK_MISMATCH');
  console.log(JSON.stringify({ verified: true, serviceAccount: EMAIL, provider: providerName, githubRef: 'refs/heads/master', privateKeyCreated: false }));
}
module.exports = { addBinding, verifyProvider, CONDITION, MAPPING };
if (require.main === module) main().catch(error => {
  const message = /^[A-Za-z0-9_./,-]+$/.test(error.message || '') ? error.message : 'SETUP_FAILED_DETAILS_WITHHELD';
  console.error(message); process.exitCode = 1;
});
