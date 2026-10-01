// Package only the approved relay, excluding unrelated production handlers/secrets.
const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve('release-assets/staging-relay-deploy/functions');
fs.mkdirSync(target, { recursive: true });
for (const name of ['package.json', 'package-lock.json', 'stagingRelay.js', 'stagingPushPolicy.js']) {
  fs.copyFileSync(path.resolve('firebase-functions', name), path.join(target, name));
}
fs.writeFileSync(path.join(target, 'index.js'), "require('firebase-admin/app').initializeApp();\nObject.assign(exports, require('./stagingRelay'));\n");
fs.writeFileSync(path.join(target, '.gitignore'), '*\n');
const env = path.join(target, '.env.blc-calendar-e302f');
if (!fs.existsSync(env)) fs.writeFileSync(env, 'STAGING_PUSH_TOKEN_SHA256=disabled\n');
console.log('Prepared isolated relay source. No existing production handlers included.');
