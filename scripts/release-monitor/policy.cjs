const { compareVersions, prepare } = require('../update-announcements.cjs');
const PACKAGE = 'dev.pages.blccalendar';
const APPLE_ID = 6790968637;
function fail(code) { const error = new Error(code); error.code = code; throw error; }
function countries(value) {
  const result = [...new Set(value.split(',').map(x => x.trim().toUpperCase()).filter(Boolean))];
  if (!result.length || result.some(x => !/^[A-Z]{2}$/.test(x))) fail('INVALID_COUNTRIES');
  return result;
}
function iosCandidate(results) {
  if (!results.length) fail('NO_STOREFRONTS');
  const versions = results.map(data => {
    const apps = data.results?.filter(x => x.trackId === APPLE_ID && x.bundleId === PACKAGE);
    if (apps?.length !== 1) fail('IOS_APP_NOT_AVAILABLE');
    const version = apps[0].version;
    try { compareVersions(version, version); } catch { fail('IOS_INVALID_VERSION'); }
    return version;
  });
  if (versions.some(x => compareVersions(x, versions[0]) !== 0)) return null;
  return versions[0];
}
function androidCandidate(track, availability, published, versions, requiredCountries) {
  if (track.track !== 'production' || !Array.isArray(track.releases) || !Array.isArray(published.releases)) fail('INVALID_PRODUCTION_RESPONSE');
  // restOfWorld describes additional countries, not a substitute for explicit US/KR eligibility.
  const offered = new Set((availability.countries || []).map(x => x.countryCode));
  if (!requiredCountries.every(x => offered.has(x))) return null;
  const live = new Set(published.releases
    .filter(x => x.track === 'production' && x.releaseLifecycleState === 'RELEASE_LIFECYCLE_STATE_PUBLISHED')
    .flatMap(x => (x.activeArtifacts || []).map(a => String(a.versionCode))));
  const eligible = track.releases.filter(x => x.status === 'completed' && x.userFraction === undefined && !x.countryTargeting);
  const codes = eligible.flatMap(x => x.versionCodes || []).filter(x => live.has(String(x))).map(String);
  if (!codes.length) return null;
  if (codes.some(x => !/^\d+$/.test(x) || !Number.isSafeInteger(Number(x)))) fail('INVALID_VERSION_CODE');
  // Mixed retained artifacts can serve different versions to different devices. Do not announce globally.
  const names = codes.map(code => versions[code]);
  if (names.some(x => !x)) fail('ANDROID_VERSION_MAPPING_MISSING_OR_AMBIGUOUS');
  if (names.some(x => compareVersions(x, names[0]) !== 0)) return null;
  return names[0];
}
function versionMap(sources) {
  const values = new Map();
  for (const source of sources) {
    const code = source.match(/^\s*versionCode\s+(\d+)\s*$/m)?.[1];
    const name = source.match(/^\s*versionName\s+["']([\d.]+)["']\s*$/m)?.[1];
    if (!code || !name) continue;
    try { compareVersions(name, name); } catch { continue; }
    if (!values.has(code)) values.set(code, new Set());
    values.get(code).add(name);
  }
  return Object.fromEntries([...values].filter(([, names]) => names.size === 1).map(([code, names]) => [code, [...names][0]]));
}
function announcementPlan(template, candidates) {
  const targets = {}, decisions = [];
  for (const [platform, version] of Object.entries(candidates)) {
    if (!['ios', 'android'].includes(platform)) fail('INVALID_PLATFORM');
    const parameter = template.parameters?.[`app_update_${platform}`];
    if (!parameter?.defaultValue?.value) fail('ANNOUNCEMENT_MISSING');
    if (Object.keys(parameter.conditionalValues || {}).length) fail('ANNOUNCEMENT_HAS_CONDITIONS');
    let current;
    try { current = JSON.parse(parameter.defaultValue.value); } catch { fail('ANNOUNCEMENT_INVALID'); }
    // An operator's disabled flag is a kill switch, never automatically re-enabled.
    if (current.enabled !== true) { decisions.push({ platform, status: 'disabled' }); continue; }
    if (!version) { decisions.push({ platform, status: 'not-fully-available' }); continue; }
    const order = compareVersions(version, current.latestVersion);
    decisions.push({ platform, status: order > 0 ? 'advance' : order === 0 ? 'current' : 'store-older', version });
    if (order > 0) targets[platform] = version;
  }
  const result = prepare(template, targets);
  // Old release-specific notes must not be presented as notes for the new release.
  for (const platform of Object.keys(targets)) {
    const parameter = result.template.parameters[`app_update_${platform}`];
    const release = JSON.parse(parameter.defaultValue.value);
    parameter.defaultValue.value = JSON.stringify({ ...release, notes: 'A new version is available. Update to get the latest improvements.' });
  }
  return { ...result, decisions };
}
module.exports = { PACKAGE, APPLE_ID, fail, countries, iosCandidate, androidCandidate, versionMap, announcementPlan };
