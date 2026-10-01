const fs = require('fs');

const read = path => fs.readFileSync(path, 'utf8');
const requiredFiles = [
  'capacitor.config.ts',
  'database.rules.json',
  'firebase-functions/index.js',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'ios/App/App/Info.plist',
  'ios/App/App/GoogleService-Info.plist'
];

const failures = requiredFiles.filter(path => !fs.existsSync(path));
const warnings = [];
if (!fs.existsSync('android/app/google-services.json')) {
  warnings.push('Android Firebase config is missing: android/app/google-services.json (push notifications will not work).');
}

const capacitor = read('capacitor.config.ts');
const androidGradle = read('android/app/build.gradle');
const iosProject = read('ios/App/App.xcodeproj/project.pbxproj');
const appId = capacitor.match(/appId:\s*['"]([^'"]+)/)?.[1] || 'UNKNOWN';
const versionCode = androidGradle.match(/versionCode\s+(\d+)/)?.[1] || 'UNKNOWN';
const versionName = androidGradle.match(/versionName\s+"([^"]+)/)?.[1] || 'UNKNOWN';
const iosVersion = iosProject.match(/MARKETING_VERSION\s*=\s*([^;]+)/)?.[1]?.trim() || 'UNKNOWN';
const iosBuild = iosProject.match(/CURRENT_PROJECT_VERSION\s*=\s*([^;]+)/)?.[1]?.trim() || 'UNKNOWN';
if (!/signingConfig\s+/.test(androidGradle)) {
  warnings.push('Android release signing is not configured in Gradle; sign the final AAB with the existing Play upload key through Android Studio or approved secure CI.');
}

console.log('Release readiness summary');
console.log(`- App ID: ${appId}`);
console.log(`- Android: ${versionName} (versionCode ${versionCode})`);
console.log(`- iOS: ${iosVersion} (build ${iosBuild}; Codemagic overrides build number)`);
warnings.forEach(warning => console.warn(`WARNING: ${warning}`));
failures.forEach(failure => console.error(`MISSING: ${failure}`));

if (failures.length > 0) process.exitCode = 1;
