const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { resolveHistoryReader, historyAudiences, historyId, saveHistory, readHistory, pruneHistory, RETENTION_MS } = require('./notificationHistory');

const reader = overrides => resolveHistoryReader({ academy: 'BLC', seniorCode: 'STAFF-EXAMPLE', today: '2030-10-16', ...overrides });
test('history reader accepts only signed academy Chief / NCOA Manager scopes', () => {
  assert.equal(reader({ token: { admin: true, scope: 'KTA' } }), null);
  assert.equal(reader({ token: { admin: true } }), null);
  assert.equal(reader({ token: { admin: true, scope: 'NCOA' } }), null);
  assert.equal(reader({ token: { ncoaManager: true, scope: 'BLC' } }), null);
  assert.equal(reader({ token: { ncoaManager: true, scope: 'NCOA', testMode: true } }), null);
  assert.deepEqual(reader({ token: { admin: true, scope: 'BLC' } }), { audience: 'admin' });
  assert.deepEqual(reader({ academy: 'KTA', token: { ncoaManager: true, scope: 'NCOA' } }), { audience: 'admin' });
});

test('read-only credentials are independently scoped and cannot inherit stale admin authentication', () => {
  assert.deepEqual(reader({ code: 'STAFF-EXAMPLE' }), { audience: 'sgl' });
  assert.deepEqual(reader({ academy: 'KTA', code: 'KTAstaff-example' }), { audience: 'sgl' });
  assert.equal(reader({ academy: 'KTA', code: 'STAFF-EXAMPLE' }), null);
  assert.equal(reader({ academy: 'KTA', code: 'BLCSTAFF-EXAMPLE' }), null);
  assert.equal(reader({ code: 'invalid', token: { admin: true, scope: 'BLC' } }), null);
});

test('student history derives the cycle from credential, requires active BLC cycle and rejects KTA', () => {
  const schedules = [{ cycleName: '12-30', date: '2030-10-01' }, { cycleName: '12-30', date: '2030-10-30' }];
  assert.deepEqual(reader({ code: 'BLC1230', schedules }), { audience: 'cycle-12-30', cycleName: '12-30' });
  assert.deepEqual(reader({ code: '1230', schedules }), { audience: 'cycle-12-30', cycleName: '12-30' });
  assert.equal(reader({ code: '1130', schedules }), null);
  assert.equal(reader({ code: 'BLC1230', schedules, today: '2030-11-01' }), null);
  assert.equal(reader({ code: 'KTA1230', academy: 'KTA', schedules }), null);
});

test('server read-only configuration matches released login without printing credentials', () => {
  const source = readFileSync(path.join(__dirname, '../src/features/auth/accessCodes.ts'), 'utf8');
  const matched = /if \(normalized === '(\d+)'\)/.exec(source);
  const { seniorCode } = require('./notificationReaderConfig.json');
  assert.ok(Boolean(matched) && matched[1] === seniorCode, 'Read-only login configuration must remain synchronized.');
});

test('audiences match explicit send choices; staff notes never enter student history', () => {
  assert.deepEqual(historyAudiences({ cycleName: '12-30', targetId: 'event:a', recipients: { sgl: true, students: true } }), ['admin', 'sgl', 'cycle-12-30']);
  assert.deepEqual(historyAudiences({ cycleName: '12-30', targetId: 'sglNotes', recipients: { sgl: true, students: true } }), ['admin', 'sgl']);
  assert.deepEqual(historyAudiences({ cycleName: '', targetId: 'day', recipients: { students: true } }), ['admin']);
  assert.deepEqual(historyAudiences({ cycleName: '12-30', recipients: {} }), ['admin']);
  assert.notEqual(historyId('BLC', 'same'), historyId('KTA', 'same'));
});

// In-memory Firestore adapter exercises persistence/retry, scoped pagination and retention without any network.
function fakeStore() {
  const records = new Map();
  const makeDoc = path => ({ path, collection: name => collection(`${path}/${name}`) });
  function collection(path) {
    const constraints = [];
    let after = null;
    let count = Infinity;
    const query = {
      doc: id => makeDoc(`${path}/${id}`),
      where: (field, op, value) => { constraints.push([field, op, value]); return query; },
      orderBy: () => query,
      limit: value => { count = value; return query; },
      startAfter: (time, id) => { after = { time, id }; return query; },
      listDocuments: async () => [...new Set([...records.keys()].filter(key => key.startsWith(`${path}/`)).map(key => key.split('/').slice(0, 2).join('/')))].map(makeDoc),
      get: async () => {
        const data = [...records].filter(([key, value]) => key.startsWith(`${path}/`) && key.split('/').length === path.split('/').length + 1 && value.createdAt)
          .map(([key, value]) => ({ ref: makeDoc(key), data: () => value }))
          .filter(doc => constraints.every(([field, op, value]) => op === '>=' ? doc.data()[field] >= value : op === '<=' ? doc.data()[field] <= value : doc.data()[field] < value))
          .sort((a, b) => b.data().createdAt - a.data().createdAt || b.data().id.localeCompare(a.data().id))
          .filter(doc => !after || doc.data().createdAt < after.time || (doc.data().createdAt === after.time && doc.data().id < after.id))
          .slice(0, count);
        return { docs: data, size: data.length, empty: !data.length };
      }
    };
    return query;
  }
  return { records, collection,
    runTransaction: async fn => fn({ get: async ref => ({ exists: records.has(ref.path) }), create: (ref, data) => records.set(ref.path, data) }),
    batch: () => ({ set: (ref, data) => records.set(ref.path, data), delete: ref => records.delete(ref.path), commit: async () => {} })
  };
}

test('history persists once before push retries and does not mix academies/audiences', async () => {
  const store = fakeStore();
  const entry = { notificationId: 'attempt-one', academy: 'BLC', targetId: 'event:a', cycleName: '12-30', createdAt: 1000, eventName: 'Original' };
  await saveHistory(store, entry, { students: true });
  await saveHistory(store, { ...entry, createdAt: 2000, eventName: 'Retry' }, { students: true });
  const page = await readHistory(store, '__name__', 'BLC', 'cycle-12-30', null, 3000);
  assert.equal(page.items.length, 1);
  assert.equal(page.items[0].eventName, 'Original');
  assert.equal(page.items[0].createdAt, 1000);
  assert.equal((await readHistory(store, '__name__', 'KTA', 'admin', null, 3000)).items.length, 0);
  assert.equal((await readHistory(store, '__name__', 'BLC', 'sgl', null, 3000)).items.length, 0);
  assert.equal((await readHistory(store, '__name__', 'BLC', 'cycle-11-30', null, 3000)).items.length, 0);
});

test('pagination includes equal-timestamp records exactly once; old records are hidden and pruned', async () => {
  const store = fakeStore();
  const now = RETENTION_MS + 10000;
  for (let i = 0; i < 105; i++) await saveHistory(store, { notificationId: `notification-${i}`, academy: 'BLC', createdAt: now - 100 }, {});
  await saveHistory(store, { notificationId: 'expired', academy: 'BLC', createdAt: 100 }, {});
  const first = await readHistory(store, '__name__', 'BLC', 'admin', null, now);
  const second = await readHistory(store, '__name__', 'BLC', 'admin', first.nextCursor, now);
  assert.equal(first.items.length, 100);
  assert.equal(second.items.length, 5);
  assert.equal(new Set([...first.items, ...second.items].map(item => item.id)).size, 105);
  assert.equal(second.nextCursor, null);
  await pruneHistory(store, now);
  assert.equal([...store.records.values()].filter(item => item.createdAt === 100).length, 0);
});
