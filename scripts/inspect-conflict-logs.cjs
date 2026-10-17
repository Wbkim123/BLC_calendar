// Read-only, aggregate production request diagnostics; never output request bodies or tokens.
const path = require('node:path');
const cli = path.join(process.env.APPDATA, 'npm/node_modules/firebase-tools/lib');
require(path.join(cli, 'logger')).logger.silent = true;
const auth = require(path.join(cli, 'auth'));
(async () => {
  const account = auth.getProjectDefaultAccount(process.cwd());
  const access = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
  const response = await fetch('https://logging.googleapis.com/v2/entries:list', {
    method: 'POST', headers: { Authorization: `Bearer ${access.access_token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ resourceNames: ['projects/blc-calendar-e302f'], orderBy: 'timestamp desc', pageSize: 150,
      filter: 'resource.type="cloud_run_revision" AND (resource.labels.service_name="getcrossacademyconflictnotices" OR resource.labels.service_name="getnotificationhistory")' })
  });
  if (!response.ok) throw new Error(`Log read HTTP ${response.status}`);
  const data = await response.json();
  for (const entry of data.entries || []) {
    const message = String(entry.jsonPayload?.message || entry.textPayload || '');
    console.log(JSON.stringify({ time: entry.timestamp, service: entry.resource?.labels?.service_name,
      status: entry.httpRequest?.status, method: entry.httpRequest?.requestMethod,
      iphone: /iPhone/.test(entry.httpRequest?.userAgent || ''), severity: entry.severity,
      auth: entry.jsonPayload?.verifications?.auth,
      category: /token.*expired/i.test(message) ? 'expired-token' : /invalid.*token|token.*invalid/i.test(message) ? 'invalid-token'
        : /unauthenticated|permission/i.test(message) ? 'auth-error' : /verification/i.test(message) ? 'verification' : undefined }));
  }
})().catch(() => { console.error('Log inspection failed; sensitive details withheld.'); process.exitCode = 1; });
