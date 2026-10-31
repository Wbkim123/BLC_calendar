const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepare, compareVersions } = require('./update-announcements.cjs');
const fixture = () => ({
  version: { versionNumber: '8' },
  conditions: [{ name: 'unrelated', expression: 'true' }],
  parameters: {
    unrelated: { defaultValue: { value: 'keep' } },
    app_update_android: { description: 'Keep description', defaultValue: { value: JSON.stringify({ enabled: true, latestVersion: '4.1.0', notes: 'Keep notes' }) } },
    app_update_ios: { defaultValue: { value: JSON.stringify({ enabled: true, latestVersion: '2.0.2', notes: 'Keep notes' }) } }
  }
});
test('only changes announcement versions and preserves original and unrelated configuration', () => {
  const original = fixture(), snapshot = structuredClone(original);
  const result = prepare(original);
  assert.deepEqual(original, snapshot);
  assert.equal(result.changes.length, 2);
  assert.deepEqual(result.template.parameters.unrelated, original.parameters.unrelated);
  assert.deepEqual(result.template.conditions, original.conditions);
  assert.equal(result.template.parameters.app_update_android.description, 'Keep description');
  assert.deepEqual(JSON.parse(result.template.parameters.app_update_android.defaultValue.value), { enabled: true, latestVersion: '4.1.1', notes: 'Keep notes' });
  assert.equal(JSON.parse(result.template.parameters.app_update_ios.defaultValue.value).latestVersion, '2.0.3');
  assert.equal(prepare(result.template).changes.length, 0);
});
test('refuses downgrades, disabled announcements, and conditional overrides', () => {
  assert.throws(() => prepare(fixture(), { android: '4.0.9' }), /downgrade/);
  const disabled = fixture();
  disabled.parameters.app_update_ios.defaultValue.value = '{"enabled":false,"latestVersion":"2.0.2"}';
  assert.throws(() => prepare(disabled), /disabled/);
  const conditional = fixture();
  conditional.parameters.app_update_ios.conditionalValues = { cohort: { value: '{}' } };
  assert.throws(() => prepare(conditional), /conditional/);
});
test('rejects invalid or missing configuration', () => {
  assert.throws(() => prepare({}), /Missing/);
  assert.throws(() => prepare(fixture(), { android: 'not-a-version' }), /Invalid/);
  assert.throws(() => prepare(fixture(), { web: '1.0' }), /Unknown/);
});
test('numeric version ordering matches client semantics for these releases', () => {
  assert.equal(compareVersions('4.1.1', '4.1.0'), 1);
  assert.equal(compareVersions('2.0.3', '2.0.2'), 1);
  assert.equal(compareVersions('4.10.0', '4.9.0'), 1);
  assert.equal(compareVersions('2.0', '2.0.0'), 0);
});
