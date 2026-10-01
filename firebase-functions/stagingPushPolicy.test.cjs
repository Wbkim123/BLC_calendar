const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { buildStagingMessage } = require('./stagingPushPolicy');
const token = 'synthetic-device-token-for-unit-tests';
const hash = createHash('sha256').update(token).digest('hex');
const claims = { uid: 'ncoa-staging-manager', admin: true, staging: true, scope: 'NCOA' };
const input = { token, academy: 'BLC', kind: 'schedule', date: '2026-09-28', targetId: 'event-1' };

test('requires staging claims as well as an explicitly approved token', () => {
  for (const invalid of [null, { admin: true }, { ...claims, staging: false }, { ...claims, scope: 'BLC' }, { ...claims, uid: 'another-user' }]) {
    assert.throws(() => buildStagingMessage(input, invalid, hash), /authentication/);
  }
  assert.throws(() => buildStagingMessage(input, claims, ''), /Approve test device/);
  assert.throws(() => buildStagingMessage({ ...input, token: token + '-other' }, claims, hash), /Approve test device/);
});
test('never accepts caller supplied audiences or production navigation metadata', () => {
  const message = buildStagingMessage({ ...input, topic: 'audience-blc-admin', condition: 'anything',
    environment: 'production', notification: { title: 'override' } }, claims, hash);
  assert.equal(message.token, token);
  assert.equal(message.topic, undefined);
  assert.equal(message.condition, undefined);
  assert.equal(message.data.environment, 'staging');
  assert.equal(message.notification.title, 'BLC Test Notification');
});
test('preserves academy and rejects invalid schedule details', () => {
  assert.equal(buildStagingMessage({ ...input, academy: 'KTA' }, claims, hash).data.academy, 'KTA');
  for (const invalid of [{ academy: 'NCOA' }, { date: 'bad' }, { targetId: '' }, { kind: 'broadcast' }]) {
    assert.throws(() => buildStagingMessage({ ...input, ...invalid }, claims, hash));
  }
});
test('welcome notification requires approval but does not need a schedule', () => {
  const message = buildStagingMessage({ token, academy: 'BLC', kind: 'welcome' }, claims, hash);
  assert.equal(message.data.type, 'test-welcome');
  assert.equal(message.data.date, '');
});
