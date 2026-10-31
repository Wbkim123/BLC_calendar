const { test } = require('node:test');
const assert = require('node:assert/strict');
const { countries, iosCandidate, androidCandidate, versionMap, announcementPlan, PACKAGE, APPLE_ID } = require('./policy.cjs');
const apple = version => ({ results: [{ trackId: APPLE_ID, bundleId: PACKAGE, version }] });
const template = () => ({ version: { versionNumber: '20' }, conditions: [{ name: 'other' }], parameters: {
  other: { defaultValue: { value: 'preserve' } },
  app_update_android: { description: 'preserve', defaultValue: { value: '{"enabled":true,"latestVersion":"4.1.1","notes":"Old release notes"}' } },
  app_update_ios: { defaultValue: { value: '{"enabled":true,"latestVersion":"2.0.3"}' } }
} });
function play() { return {
  track: { track: 'production', releases: [{ name: 'Not a version', status: 'completed', versionCodes: ['15'] }] },
  availability: { countries: [{ countryCode: 'US' }, { countryCode: 'KR' }] },
  published: { releases: [{ track: 'production', releaseLifecycleState: 'RELEASE_LIFECYCLE_STATE_PUBLISHED', activeArtifacts: [{ versionCode: 15 }] }] },
  versions: { '15': '4.1.1' }
}; }
const candidate = x => androidCandidate(x.track, x.availability, x.published, x.versions, ['US', 'KR']);
test('country input is normalized and rejects invalid/empty configuration', () => {
  assert.deepEqual(countries('us, KR,us'), ['US', 'KR']);
  assert.throws(() => countries(''), /INVALID_COUNTRIES/);
  assert.throws(() => countries('USA'), /INVALID_COUNTRIES/);
});
test('iOS requires the correct app and matching public version across storefronts', () => {
  assert.equal(iosCandidate([apple('2.0.3'), apple('2.0.3')]), '2.0.3');
  assert.equal(iosCandidate([apple('2.0.3'), apple('2.0.4')]), null);
  assert.throws(() => iosCandidate([apple('2.0.3'), { results: [] }]), /IOS_APP_NOT_AVAILABLE/);
  const wrong = apple('2.0.4'); wrong.results[0].bundleId = 'other';
  assert.throws(() => iosCandidate([wrong]), /IOS_APP_NOT_AVAILABLE/);
  assert.throws(() => iosCandidate([apple('2.0.4-beta')]), /IOS_INVALID_VERSION/);
});
test('Android requires a live completed production release and uses code mapping, not release name', () => {
  assert.equal(candidate(play()), '4.1.1');
  const x = play(); x.track.track = 'internal';
  assert.throws(() => candidate(x), /INVALID_PRODUCTION_RESPONSE/);
});
test('Android blocks drafts, staged and halted releases, or approved-but-unpublished releases', () => {
  for (const status of ['draft', 'inProgress', 'halted', 'statusUnspecified']) {
    const x = play(); x.track.releases[0].status = status; assert.equal(candidate(x), null);
  }
  const x = play(); x.published.releases[0].releaseLifecycleState = 'RELEASE_LIFECYCLE_STATE_APPROVED_NOT_PUBLISHED';
  assert.equal(candidate(x), null);
});
test('Android blocks missing countries, country targeting and mixed device artifacts', () => {
  const x = play(); x.availability.countries.pop(); x.availability.restOfWorld = true;
  assert.equal(candidate(x), null);
  const y = play(); y.track.releases[0].countryTargeting = { countries: ['US'] };
  assert.equal(candidate(y), null);
  const z = play(); z.track.releases[0].versionCodes.push('14'); z.versions['14'] = '4.1.0';
  z.published.releases[0].activeArtifacts.push({ versionCode: 14 });
  assert.equal(candidate(z), null);
});
test('Android fails visibly on unmapped production versions', () => {
  const x = play(); x.versions = {};
  assert.throws(() => candidate(x), /MAPPING_MISSING_OR_AMBIGUOUS/);
});
test('source history mapping rejects ambiguous build numbers', () => {
  const source = (code, name) => `versionCode ${code}\nversionName "${name}"\n`;
  assert.deepEqual(versionMap([source(15, '4.1.1'), source(14, '4.1.0'), source(15, '4.1.1')]), { '14': '4.1.0', '15': '4.1.1' });
  assert.deepEqual(versionMap([source(15, '4.1.1'), source(15, '4.1.2')]), {});
});
test('plan advances only newer versions and preserves unrelated configuration without mutating input', () => {
  const original = template(), before = structuredClone(original);
  const plan = announcementPlan(original, { android: '4.1.2', ios: '2.0.3' });
  assert.deepEqual(original, before);
  assert.equal(plan.changes.length, 1);
  assert.deepEqual(plan.template.parameters.other, original.parameters.other);
  assert.deepEqual(plan.template.conditions, original.conditions);
  assert.equal(plan.template.parameters.app_update_android.description, 'preserve');
  assert.match(JSON.parse(plan.template.parameters.app_update_android.defaultValue.value).notes, /new version/);
  assert.equal(announcementPlan(plan.template, { android: '4.1.2', ios: '2.0.3' }).changes.length, 0);
  assert.equal(announcementPlan(original, { android: '4.1.0', ios: null }).changes.length, 0);
});
test('operator disable is respected and conditional overrides require review', () => {
  const x = template(); x.parameters.app_update_android.defaultValue.value = '{"enabled":false,"latestVersion":"4.1.1"}';
  assert.equal(announcementPlan(x, { android: '4.1.2' }).changes.length, 0);
  x.parameters.app_update_android.conditionalValues = { group: { value: '{}' } };
  assert.throws(() => announcementPlan(x, { android: '4.1.2' }), /HAS_CONDITIONS/);
});
module.exports = { template, play };
