const fs = require('fs');
const path = require('path');

const files = ['.env', '.env.local', '.env.production', '.env.production.local'];
const keys = ['REACT_APP_USE_FIREBASE_EMULATORS', 'REACT_APP_FIREBASE_EMULATOR_PROJECT'];
const values = { ...process.env };

for (const file of files) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) continue;
  const contents = fs.readFileSync(fullPath, 'utf8');
  for (const key of keys) {
    const match = contents.match(new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=\\s*['\"]?([^'\"\\s#]+)`, 'm'));
    if (match) values[key] = match[1];
  }
}

if (values.REACT_APP_USE_FIREBASE_EMULATORS === 'true' ||
    (values.REACT_APP_FIREBASE_EMULATOR_PROJECT || '').startsWith('demo-')) {
  console.error('Production build blocked: Firebase emulator settings are present.');
  process.exit(1);
}
