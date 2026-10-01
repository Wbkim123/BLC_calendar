const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const javaHomes = [
  process.env.JAVA_HOME,
  process.env.ANDROID_STUDIO_JBR,
  'D:\\Android\\sdk\\jbr'
].filter(Boolean);
const javaHome = javaHomes.find(home => fs.existsSync(path.join(home, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')));
if (javaHome) {
  process.env.JAVA_HOME = javaHome;
  process.env.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${process.env.PATH || ''}`;
}

const mode = process.argv[2] === 'exec' ? 'exec' : 'start';
const args = [
  `emulators:${mode}`,
  '--config', 'firebase.emulators.json',
  '--project', 'demo-blc-calendar',
  '--only', 'auth,database,functions'
];
if (mode === 'exec') args.push('"node scripts/firebase-emulator-check.cjs"');

const result = spawnSync(process.platform === 'win32' ? 'firebase.cmd' : 'firebase', args, {
  cwd: process.cwd(),
  stdio: 'inherit',
  shell: process.platform === 'win32'
});
if (result.error) {
  console.error('Could not launch Firebase CLI. Install Firebase CLI and ensure it is on PATH.');
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
