const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

const LEGACY_PUSH_TOPIC = 'schedule-updates';
const ADMIN_ACCESS_CODE = defineSecret('ADMIN_ACCESS_CODE');

const requireToken = request => {
  const token = request.data?.token;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new HttpsError('invalid-argument', 'A valid FCM token is required.');
  }
  return token;
};

const sanitizeCycleName = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');

const getAudienceTopic = (role, cycleName) => {
  if (role === 'VIEWER') return 'audience-sgl';
  if (role === 'ADMIN') return 'audience-admin';

  if (role === 'STUDENT') {
    const safeCycle = sanitizeCycleName(cycleName);
    if (!safeCycle) {
      throw new HttpsError('invalid-argument', 'A cycle name is required for students.');
    }
    return `cycle-${safeCycle}`;
  }

  throw new HttpsError('invalid-argument', 'A valid user role is required.');
};

const isValidAudienceTopic = topic =>
  topic === 'audience-sgl' || topic === 'audience-admin' || /^cycle-[a-zA-Z0-9_-]+$/.test(topic);

const requireText = (value, field, maxLength) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new HttpsError('invalid-argument', `A valid ${field} is required.`);
  }
  return value.trim();
};

exports.createAdminSession = onCall(
  { region: 'us-central1', secrets: [ADMIN_ACCESS_CODE] },
  async request => {
    const code = request.data?.code;
    if (typeof code !== 'string' || code.trim() !== ADMIN_ACCESS_CODE.value()) {
      throw new HttpsError('permission-denied', 'Invalid administrator code.');
    }

    const token = await getAuth().createCustomToken('blc-schedule-admin', { admin: true });
    return { token };
  }
);

exports.registerPushToken = onCall({ region: 'us-central1' }, async request => {
  const token = requireToken(request);
  const topic = getAudienceTopic(request.data?.role, request.data?.cycleName);
  const previousTopic = request.data?.previousTopic;

  const obsoleteTopics = [LEGACY_PUSH_TOPIC];
  if (isValidAudienceTopic(previousTopic) && previousTopic !== topic) {
    obsoleteTopics.push(previousTopic);
  }
  await Promise.all(obsoleteTopics.map(item => getMessaging().unsubscribeFromTopic(token, item)));

  await getMessaging().subscribeToTopic(token, topic);
  return { subscribed: true, topic };
});

exports.unregisterPushToken = onCall({ region: 'us-central1' }, async request => {
  const token = requireToken(request);
  const topic = request.data?.topic;
  const topics = [LEGACY_PUSH_TOPIC];
  if (isValidAudienceTopic(topic)) topics.push(topic);

  await Promise.all(topics.map(item => getMessaging().unsubscribeFromTopic(token, item)));
  return { subscribed: false, topic: null };
});

exports.sendScheduleNotification = onCall({ region: 'us-central1' }, async request => {
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Administrator authentication is required.');
  }

  const date = requireText(request.data?.date, 'date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError('invalid-argument', 'The date must use YYYY-MM-DD format.');
  }

  const cycleName = request.data?.cycleName
    ? requireText(request.data.cycleName, 'cycle name', 40)
    : '';
  const safeCycle = sanitizeCycleName(cycleName);
  const changeType = requireText(request.data?.changeType, 'change type', 40);
  const targetId = requireText(request.data?.targetId, 'target ID', 100);
  const changedFields = Array.isArray(request.data?.changedFields)
    ? request.data.changedFields
        .filter(field => typeof field === 'string' && /^[a-zA-Z]+$/.test(field))
        .slice(0, 10)
    : [];
  const recipients = request.data?.recipients || {};
  const topics = ['audience-admin'];

  if (recipients.sgl === true) topics.push('audience-sgl');
  if (recipients.students === true) {
    if (!safeCycle) {
      throw new HttpsError('invalid-argument', 'A cycle is required for student notifications.');
    }
    topics.push(`cycle-${safeCycle}`);
  }
  const cycleText = cycleName ? `${cycleName} · ` : '';
  const notification = {
    title: 'BLC Schedule Updated',
    body: `${cycleText}${date} — ${changeType}`
  };
  const data = {
    type: 'schedule-update',
    date,
    cycleName,
    changeType,
    targetId,
    changedFields: changedFields.join(',')
  };

  const linkParams = new URLSearchParams({
    date,
    highlight: targetId,
    change: changeType,
    fields: changedFields.join(',')
  });

  const messageIds = await Promise.all(topics.map(topic => getMessaging().send({
    topic,
    notification,
    data,
    webpush: { fcmOptions: { link: `/?${linkParams.toString()}` } },
    android: { priority: 'high' }
  })));

  return { sent: true, topics, messageIds };
});
