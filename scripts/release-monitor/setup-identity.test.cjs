const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addBinding, verifyProvider, CONDITION, MAPPING } = require('./setup-identity.cjs');
test('IAM additions preserve unrelated and conditional bindings, ETag and audit config', () => {
  const original = { version: 3, etag: 'fixture-etag', auditConfigs: [{ service: 'allServices' }], bindings: [
    { role: 'role/target', members: ['existing'], condition: { expression: 'fixture' } },
    { role: 'role/other', members: ['other'] }
  ] };
  const snapshot = structuredClone(original);
  const result = addBinding(original, 'role/target', 'new');
  assert.deepEqual(original, snapshot);
  assert.equal(result.policy.etag, original.etag);
  assert.equal(result.policy.version, 3);
  assert.deepEqual(result.policy.auditConfigs, original.auditConfigs);
  assert.deepEqual(result.policy.bindings.slice(0, 2), original.bindings);
  assert.deepEqual(result.policy.bindings[2], { role: 'role/target', members: ['new'] });
  assert.equal(addBinding(result.policy, 'role/target', 'new').changed, false);
});
test('IAM additions append to an existing unconditional role rather than replacing members', () => {
  assert.deepEqual(addBinding({ bindings: [{ role: 'r', members: ['a'] }] }, 'r', 'b').policy.bindings, [{ role: 'r', members: ['a', 'b'] }]);
});
test('existing provider must match exact restricted trust', () => {
  const provider = { state: 'ACTIVE', oidc: { issuerUri: 'https://token.actions.githubusercontent.com' }, attributeCondition: CONDITION, attributeMapping: MAPPING };
  assert.doesNotThrow(() => verifyProvider(provider));
  assert.throws(() => verifyProvider({ ...provider, attributeCondition: 'true' }));
  assert.throws(() => verifyProvider({ ...provider, disabled: true }));
  assert.throws(() => verifyProvider({ ...provider, oidc: { ...provider.oidc, allowedAudiences: ['other'] } }));
});
