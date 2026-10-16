const { createHash, randomUUID } = require('node:crypto');

const RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const PAGE_SIZE = 100;
const normalize = value => typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : '';

// Credentials are supplied by the existing read-only login configuration, never by the caller.
function resolveHistoryReader({ token, code, academy, seniorCode, schedules, today }) {
  if (!['BLC', 'KTA'].includes(academy) || token?.testMode) return null;
  if (code) {
    const normalized = normalize(code);
    if (normalized === seniorCode && academy === 'BLC') return { audience: 'sgl' };
    if (normalized === `${academy}${seniorCode}`) return { audience: 'sgl' };
    if (academy !== 'BLC') return null;
    const student = /^(?:BLC)?(\d{2})(\d{2})$/.exec(normalized);
    if (!student) return null;
    const cycleName = `${student[1]}-${student[2]}`;
    const dates = Object.values(schedules || {}).filter(day => day?.cycleName === cycleName)
      .map(day => day.date).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort();
    if (!dates.length || today < dates[0] || today > dates[dates.length - 1]) return null;
    return { audience: `cycle-${cycleName}`, cycleName };
  }
  if (token?.ncoaManager === true && token.scope === 'NCOA') return { audience: 'admin' };
  if (token?.admin === true && token.scope === academy) return { audience: 'admin' };
  return null;
}

const bucketName = (academy, audience) => `${academy.toLowerCase()}-${audience}`;

function historyAudiences({ cycleName, targetId, recipients }) {
  const audiences = ['admin'];
  if (recipients?.sgl === true) audiences.push('sgl');
  // Staff-only notes must never become a student history item, even with a malformed request.
  if (recipients?.students === true && targetId !== 'sglNotes' && /^\d{2}-\d{2}$/.test(cycleName)) {
    audiences.push(`cycle-${cycleName}`);
  }
  return audiences;
}

const historyId = (academy, notificationId) => createHash('sha256')
  .update(`${academy}:${notificationId || randomUUID()}`).digest('hex');

async function saveHistory(store, entry, recipients) {
  const { notificationId, ...record } = entry;
  const id = historyId(entry.academy, notificationId);
  const batch = store.batch();
  // A transaction preserves the original time/content if a failed push is retried.
  await store.runTransaction(async transaction => {
    const refs = historyAudiences({ ...entry, recipients }).map(audience =>
      store.collection('notificationHistory').doc(bucketName(entry.academy, audience)).collection('items').doc(id));
    const snapshots = await Promise.all(refs.map(ref => transaction.get(ref)));
    snapshots.forEach((snapshot, index) => {
      if (!snapshot.exists) transaction.create(refs[index], { ...record, id });
    });
  });
  // Parent documents make retention cleanup discoverable without collection-group indexes.
  historyAudiences({ ...entry, recipients }).forEach(audience => {
    batch.set(store.collection('notificationHistory').doc(bucketName(entry.academy, audience)), { academy: entry.academy });
  });
  await batch.commit();
  return id;
}

async function readHistory(store, documentId, academy, audience, cursor, now = Date.now()) {
  let query = store.collection('notificationHistory').doc(bucketName(academy, audience)).collection('items')
    .where('createdAt', '>=', now - RETENTION_MS).where('createdAt', '<=', now)
    .orderBy('createdAt', 'desc').orderBy(documentId, 'desc').limit(PAGE_SIZE + 1);
  if (cursor) query = query.startAfter(cursor.createdAt, cursor.id);
  const snapshot = await query.get();
  const items = snapshot.docs.slice(0, PAGE_SIZE).map(doc => doc.data());
  const last = items[items.length - 1];
  return { items, nextCursor: snapshot.size > PAGE_SIZE ? { id: last.id, createdAt: last.createdAt } : null };
}

async function pruneHistory(store, now = Date.now()) {
  const buckets = await store.collection('notificationHistory').listDocuments();
  for (const bucket of buckets) {
    for (;;) {
      const expired = await bucket.collection('items').where('createdAt', '<', now - RETENTION_MS).limit(400).get();
      if (expired.empty) break;
      const batch = store.batch();
      expired.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
    }
  }
}

module.exports = { RETENTION_MS, resolveHistoryReader, historyAudiences, historyId, saveHistory, readHistory, pruneHistory };
