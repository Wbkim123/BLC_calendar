const { spawnSync } = require('child_process');

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const tests = spawnSync(npm, ['run', 'test:unit:ci'], {
  cwd: process.cwd(), stdio: 'inherit', shell: process.platform === 'win32'
});
if (tests.status !== 0) process.exit(tests.status || 1);

const smoke = spawnSync(process.execPath, ['scripts/firebase-emulator-smoke.cjs'], {
  cwd: process.cwd(), stdio: 'inherit', env: process.env
});
process.exit(smoke.status === null ? 1 : smoke.status);
