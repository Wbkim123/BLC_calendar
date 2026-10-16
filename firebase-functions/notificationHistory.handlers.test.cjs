const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function handlers({ failSave = false, failPush = false } = {}) {
  const calls = [];
  const exported = {};
  class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
  const mocks = {
    'firebase-functions/v2/https': { onCall: (_options, handler) => handler, HttpsError },
    'firebase-functions/v2/scheduler': { onSchedule: (_options, handler) => handler },
    'firebase-functions/params': { defineSecret: () => ({ value: () => 'fixture-secret' }) },
    'firebase-admin/app': { initializeApp: () => {} },
    'firebase-admin/auth': { getAuth: () => ({}) },
    'firebase-admin/database': { getDatabase: () => ({ ref: () => ({ once: async () => ({ val: () => null }) }) }) },
    'firebase-admin/firestore': { getFirestore: () => ({}), FieldPath: { documentId: () => '__name__' } },
    'firebase-admin/messaging': { getMessaging: () => ({ send: async message => { calls.push({ type: 'push', message }); if (failPush) throw new Error('Push failed'); return 'fixture-message'; } }) },
    './notificationReaderConfig.json': { seniorCode: 'STAFF-EXAMPLE' },
    './notificationHistory': { ...require('./notificationHistory'),
      saveHistory: async (_store, entry, recipients) => { calls.push({ type: 'save', entry, recipients }); if (failSave) throw new Error('Storage unavailable'); return 'a'.repeat(64); },
      readHistory: async (_store, _documentId, academy, audience, cursor) => { calls.push({ type: 'read', academy, audience, cursor }); return { items: [], nextCursor: null }; },
      pruneHistory: async () => { calls.push({ type: 'prune' }); }
    }
  };
  const sandbox = { exports: exported, module: { exports: exported }, process: { env: {} }, Date, Intl, URLSearchParams,
    require: name => mocks[name] || require(name.startsWith('.') ? path.join(__dirname, name) : name) };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8'), sandbox);
  return { api: exported, calls };
}
const request = overrides => ({ auth: { token: { admin: true, scope: 'BLC' } }, data: {
  academy: 'BLC', date: '2030-10-16', cycleName: '12-30', targetId: 'event:one', changeType: 'Event updated', eventName: 'Training', previewText: 'TIME: 0630', changedFields: ['time'], notificationId: 'fixture-id', recipients: { sgl: true, students: true }, ...overrides
} });

test('production send saves history before push, including stable id and explicit audiences', async () => {
  const { api, calls } = handlers();
  await api.sendScheduleNotification(request());
  assert.equal(calls[0].type, 'save');
  assert.equal(calls[0].entry.notificationId, 'fixture-id');
  assert.equal(calls[0].entry.eventName, 'Training');
  assert.equal(calls[0].recipients.students, true);
  assert.ok(calls.slice(1).every(call => call.type === 'push' && call.message.data.notificationId === 'a'.repeat(64)));
});
test('history storage failure stops push, while push failure does not erase recorded history', async () => {
  const unavailable = handlers({ failSave: true });
  await assert.rejects(unavailable.api.sendScheduleNotification(request()), /Storage unavailable/);
  assert.equal(unavailable.calls.length, 1);
  const pushFailure = handlers({ failPush: true });
  await assert.rejects(pushFailure.api.sendScheduleNotification(request()), /Push failed/);
  assert.equal(pushFailure.calls[0].type, 'save');
});
test('cross-academy send and student delivery of staff notes fail before storage or push', async () => {
  const { api, calls } = handlers();
  await assert.rejects(api.sendScheduleNotification(request({ academy: 'KTA' })), error => error.code === 'permission-denied');
  await assert.rejects(api.sendScheduleNotification(request({ targetId: 'sglNotes' })), error => error.code === 'invalid-argument');
  assert.equal(calls.length, 0);
});
test('history callable validates credentials and ignores forged audience/cycle request fields', async () => {
  const { api, calls } = handlers();
  await api.getNotificationHistory({ data: { academy: 'KTA', code: 'KTASTAFF-EXAMPLE', audience: 'admin', cycleName: '12-30' } });
  assert.equal(calls[0].audience, 'sgl');
  assert.equal(calls[0].academy, 'KTA');
  await assert.rejects(api.getNotificationHistory({ data: { academy: 'KTA', code: 'BLCSTAFF-EXAMPLE' } }), error => error.code === 'permission-denied');
  await assert.rejects(api.getNotificationHistory({ auth: { token: { admin: true, scope: 'BLC' } }, data: { academy: 'KTA' } }), error => error.code === 'permission-denied');
  await assert.rejects(api.getNotificationHistory({ auth: { token: { admin: true, scope: 'BLC' } }, data: { academy: 'BLC', cursor: { createdAt: 'wrong', id: 'invalid' } } }), error => error.code === 'invalid-argument');
  assert.equal(calls.length, 1);
});
