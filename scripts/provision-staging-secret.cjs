// Explicitly authorized deployment helper. Never prints or writes secret values.
const fs = require('node:fs');
const path = require('node:path');
const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
require(path.join(cli, 'logger')).logger.silent = true;
const auth = require(path.join(cli, 'auth'));
const project = 'ncoa-calendar-staging';
const secretName = 'STAGING_ACCESS_CODE';

(async () => {
  const account = auth.getProjectDefaultAccount(process.cwd());
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI login is required.');
  const access = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const call = async (url, method = 'GET', body) => {
    const response = await fetch(url, {
      method, headers: { Authorization: `Bearer ${access.access_token}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30000)
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  };
  const service = `https://serviceusage.googleapis.com/v1/projects/${project}/services/secretmanager.googleapis.com`;
  const enabled = await call(service, 'GET');
  if (enabled.data.state !== 'ENABLED') {
    const result = await call(`${service}:enable`, 'POST', {});
    if (result.status !== 200) throw new Error(`Secret Manager enable failed (HTTP ${result.status}).`);
    if (result.data.name) {
      for (let attempt = 0; attempt < 30; attempt++) {
        const operation = await call(`https://serviceusage.googleapis.com/v1/${result.data.name}`);
        if (operation.data.error) throw new Error('Secret Manager enable operation failed.');
        if (operation.data.done) break;
        if (attempt === 29) throw new Error('Secret Manager enable operation is still pending.');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  if (process.argv.includes('--inspect-signer-policy')) {
    const serviceAccount = '19984974124-compute@developer.gserviceaccount.com';
    const resource = `https://iam.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}`;
    const result = await call(`${resource}:getIamPolicy`, 'POST', { options: { requestedPolicyVersion: 3 } });
    if (result.status !== 200) throw new Error(`Policy inspection failed (HTTP ${result.status}).`);
    console.log(JSON.stringify((result.data.bindings || []).filter(binding => binding.role === 'roles/iam.serviceAccountTokenCreator')
      .map(binding => ({ role: binding.role, members: binding.members, conditional: Boolean(binding.condition) }))));
    return;
  }
  if (process.argv.includes('--grant-custom-token-signer')) {
    const serviceAccount = '19984974124-compute@developer.gserviceaccount.com';
    const resource = `https://iam.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}`;
    const currentPolicy = await call(`${resource}:getIamPolicy`, 'POST', { options: { requestedPolicyVersion: 3 } });
    if (currentPolicy.status !== 200) throw new Error(`Service-account policy read failed (HTTP ${currentPolicy.status}): ${currentPolicy.data.error?.message || "unknown"}`);
    const policy = currentPolicy.data;
    const role = 'roles/iam.serviceAccountTokenCreator';
    const member = `serviceAccount:${serviceAccount}`;
    if (!(policy.bindings || []).some(binding => binding.role === role && binding.members?.includes(member))) {
      let binding = (policy.bindings || []).find(item => item.role === role && !item.condition);
      if (!binding) { binding = { role, members: [] }; (policy.bindings ||= []).push(binding); }
      binding.members.push(member);
      const update = await call(`${resource}:setIamPolicy`, 'POST', { policy });
      if (update.status !== 200) throw new Error(`Custom-token signer grant failed (HTTP ${update.status}).`);
    }
    console.log('Staging function service account can sign its own Firebase custom tokens.');
    return;
  }
  if (process.argv.includes('--inspect-locations')) {
    const policy = await call(`https://cloudresourcemanager.googleapis.com/v1/projects/${project}:getEffectiveOrgPolicy`, 'POST', { constraint: 'constraints/gcp.resourceLocations' });
    console.log(JSON.stringify({ status: policy.status, policy: policy.data.listPolicy, error: policy.data.error?.message }));
    return;
  }
  const source = fs.readFileSync('firebase-functions/index.js', 'utf8');
  const match = source.match(/const TEST_ACCESS_CODE = '([^']+)'/);
  if (!match) throw new Error('Existing test credential could not be resolved.');
  const base = `https://secretmanager.googleapis.com/v1/projects/${project}/secrets`;
  const existing = await call(`${base}/${secretName}`);
  if (existing.status === 404) {
    const created = await call(`${base}?secretId=${secretName}`, 'POST', { replication: { userManaged: { replicas: [{ location: 'us-central1' }] } } });
    if (created.status !== 200) throw new Error(`Secret creation failed (HTTP ${created.status}): ${created.data.error?.message || "unknown"}`);
  } else if (existing.status !== 200) throw new Error(`Secret lookup failed (HTTP ${existing.status}).`);
  const current = await call(`${base}/${secretName}/versions/latest:access`);
  if (current.status === 200) {
    if (Buffer.from(current.data.payload.data, 'base64').toString() !== match[1]) {
      throw new Error('An existing staging secret differs. No overwrite performed.');
    }
    console.log('Staging secret already matches the existing test credential.');
    return;
  }
  if (current.status !== 404) throw new Error(`Secret version lookup failed (HTTP ${current.status}).`);
  const added = await call(`${base}/${secretName}:addVersion`, 'POST', { payload: { data: Buffer.from(match[1]).toString('base64') } });
  if (added.status !== 200) throw new Error(`Secret provisioning failed (HTTP ${added.status}).`);
  console.log('Staging secret provisioned successfully. No credential values were logged.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
