// Keep staging exports separate from all production handlers and secrets.
if (process.env.GCLOUD_PROJECT === 'ncoa-calendar-staging') {
  module.exports = require('./staging');
} else {
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');

initializeApp();

// Even local callable-function tests must never deliver real push messages.
const isDemoFunctionEmulator =
  process.env.FUNCTIONS_EMULATOR === 'true' &&
  (process.env.GCLOUD_PROJECT || '').startsWith('demo-');

const LEGACY_PUSH_TOPIC = 'schedule-updates';
const TEST_ACCESS_CODE = '318709';
const ADMIN_ACCESS_CODE = defineSecret('ADMIN_ACCESS_CODE');
const NCOA_ACCESS_CODE = defineSecret('NCOA_ACCESS_CODE');

const requireToken = request => {
  const token = request.data?.token;
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) {
    throw new HttpsError('invalid-argument', 'A valid FCM token is required.');
  }
  return token;
};

const sanitizeCycleName = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
const sanitizeAcademy = value => {
  const academy = String(value || 'BLC').trim().toUpperCase();
  if (academy !== 'BLC' && academy !== 'KTA') {
    throw new HttpsError('invalid-argument', 'A valid academy is required.');
  }
  return academy;
};

const getAudienceTopic = (role, cycleName, academyValue) => {
  const academy = sanitizeAcademy(academyValue).toLowerCase();
  if (role === 'VIEWER') return `audience-${academy}-sgl`;
  if (role === 'ADMIN') return `audience-${academy}-admin`;

  if (role === 'STUDENT') {
    const safeCycle = sanitizeCycleName(cycleName);
    if (!safeCycle) {
      throw new HttpsError('invalid-argument', 'A cycle name is required for students.');
    }
    return `${academy}-cycle-${safeCycle}`;
  }

  throw new HttpsError('invalid-argument', 'A valid user role is required.');
};

const isValidAudienceTopic = topic =>
  topic === 'audience-sgl' || topic === 'audience-admin' || /^cycle-[a-zA-Z0-9_-]+$/.test(topic) ||
  /^audience-(blc|kta)-(sgl|admin)$/.test(topic) || topic === 'audience-ncoa-commander' || /^(blc|kta)-cycle-[a-zA-Z0-9_-]+$/.test(topic);

const requireText = (value, field, maxLength) => {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new HttpsError('invalid-argument', `A valid ${field} is required.`);
  }
  return value.trim();
};

const optionalText = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};

exports.createAdminSession = onCall(
  { region: 'us-central1', secrets: [ADMIN_ACCESS_CODE, NCOA_ACCESS_CODE] },
  async request => {
    if (isDemoFunctionEmulator) {
      const token = await getAuth().createCustomToken('local-emulator-manager', {
        admin: true,
        scope: 'NCOA'
      });
      return { token, testMode: true, scope: 'NCOA' };
    }
    const code = request.data?.code;
    const normalizedCode = typeof code === 'string' ? code.replace(/\s+/g, '').toUpperCase() : '';
    const isTestAdmin = normalizedCode === TEST_ACCESS_CODE;
    const legacyAdminCode = ADMIN_ACCESS_CODE.value().trim().toUpperCase();
    const ncoaCode = NCOA_ACCESS_CODE.value().trim().toUpperCase();
    const isNcoaManager = normalizedCode === ncoaCode || normalizedCode === `NCOA${ncoaCode}`;
    const academyMatch = /^(BLC|KTA)(.+)$/.exec(normalizedCode);
    const academyScope = academyMatch?.[1];
    const isAcademyImporter = Boolean(academyScope && academyMatch?.[2] === legacyAdminCode);
    const isLegacyAdmin = normalizedCode === legacyAdminCode;

    if (!isTestAdmin && !isNcoaManager && !isAcademyImporter && !isLegacyAdmin) {
      throw new HttpsError('permission-denied', 'Invalid administrator code.');
    }

    const scope = isNcoaManager || isLegacyAdmin || isTestAdmin ? 'NCOA' : academyScope;

    const token = await getAuth().createCustomToken(
      isTestAdmin ? 'ncoa-schedule-test-admin' : `ncoa-schedule-admin-${String(scope).toLowerCase()}`,
      isTestAdmin
        ? { testMode: true }
        : isNcoaManager
          ? { ncoaManager: true, scope: 'NCOA' }
          : { admin: true, scope }
    );
    return { token, testMode: isTestAdmin, scope };
  }
);

exports.registerPushToken = onCall({ region: 'us-central1' }, async request => {
  if (isDemoFunctionEmulator) return { subscribed: false, topic: null, emulatorOnly: true };
  const token = requireToken(request);
  const academy = sanitizeAcademy(request.data?.academy);
  const allAcademies = request.data?.allAcademies === true;
  const topics = allAcademies && request.data?.role === 'VIEWER'
    ? ['audience-ncoa-commander']
    : [getAudienceTopic(request.data?.role, request.data?.cycleName, academy)];
  const previousTopic = request.data?.previousTopic;

  const obsoleteTopics = [LEGACY_PUSH_TOPIC];
  if (isValidAudienceTopic(previousTopic) && !topics.includes(previousTopic)) {
    obsoleteTopics.push(previousTopic);
  }
  await Promise.all(obsoleteTopics.map(item => getMessaging().unsubscribeFromTopic(token, item)));

  await Promise.all(topics.map(item => getMessaging().subscribeToTopic(token, item)));
  return { subscribed: true, topic: topics[0], topics };
});

exports.unregisterPushToken = onCall({ region: 'us-central1' }, async request => {
  if (isDemoFunctionEmulator) return { subscribed: false, topic: null, emulatorOnly: true };
  const token = requireToken(request);
  const topic = request.data?.topic;
  const topics = [LEGACY_PUSH_TOPIC];
  if (isValidAudienceTopic(topic)) topics.push(topic);
  if (request.data?.role === 'VIEWER') topics.push('audience-sgl');
  if (request.data?.role === 'ADMIN') topics.push('audience-admin');
  const academy = sanitizeAcademy(request.data?.academy).toLowerCase();
  if (request.data?.role === 'VIEWER' && request.data?.allAcademies !== true) topics.push(`audience-${academy}-sgl`);
  if (request.data?.role === 'ADMIN') topics.push(`audience-${academy}-admin`);
  if (request.data?.allAcademies === true && request.data?.role === 'VIEWER') topics.push('audience-ncoa-commander');
  if (request.data?.role === 'STUDENT') {
    const safeCycle = sanitizeCycleName(request.data?.cycleName);
    if (safeCycle) {
      topics.push(`cycle-${safeCycle}`);
      topics.push(`${academy}-cycle-${safeCycle}`);
    }
  }

  await Promise.all([...new Set(topics)].map(item => getMessaging().unsubscribeFromTopic(token, item)));
  return { subscribed: false, topic: null };
});

exports.sendScheduleNotification = onCall({ region: 'us-central1' }, async request => {
  if (isDemoFunctionEmulator) return { sent: false, emulatorOnly: true };
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Administrator authentication is required.');
  }

  const date = requireText(request.data?.date, 'date', 10);
  const academy = sanitizeAcademy(request.data?.academy);
  const requestScope = request.auth?.token?.scope;
  if (requestScope && requestScope !== academy) {
    throw new HttpsError('permission-denied', 'This administrator cannot manage the selected academy.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError('invalid-argument', 'The date must use YYYY-MM-DD format.');
  }

  const cycleName = request.data?.cycleName
    ? requireText(request.data.cycleName, 'cycle name', 40)
    : '';
  const safeCycle = sanitizeCycleName(cycleName);
  const changeType = requireText(request.data?.changeType, 'change type', 40);
  const previewText = optionalText(request.data?.previewText, 120);
  const targetId = requireText(request.data?.targetId, 'target ID', 100);
  const changedFields = Array.isArray(request.data?.changedFields)
    ? request.data.changedFields
        .filter(field => typeof field === 'string' && /^[a-zA-Z]+$/.test(field))
        .slice(0, 10)
    : [];
  const recipients = request.data?.recipients || {};
  const academyTopic = academy.toLowerCase();
  const topics = [`audience-${academyTopic}-admin`];
  topics.push('audience-ncoa-commander');

  if (recipients.sgl === true) topics.push(`audience-${academyTopic}-sgl`);
  if (recipients.students === true) {
    if (!safeCycle) {
      throw new HttpsError('invalid-argument', 'A cycle is required for student notifications.');
    }
    topics.push(`${academyTopic}-cycle-${safeCycle}`);
  }
  // Transition support for released BLC builds subscribed to legacy topics.
  if (academy === 'BLC') {
    topics.push('audience-admin');
    if (recipients.sgl === true) topics.push('audience-sgl');
    if (recipients.students === true && safeCycle) topics.push(`cycle-${safeCycle}`);
  }
  const cycleText = cycleName ? `${cycleName} · ` : '';
  const notification = {
    title: `${academy} Schedule Updated`,
    body: previewText || `${cycleText}${date} — ${changeType}`
  };
  const data = {
    type: 'schedule-update',
    academy,
    date,
    cycleName,
    changeType,
    previewText,
    targetId,
    changedFields: changedFields.join(',')
  };

  const linkParams = new URLSearchParams({
    date,
    highlight: targetId,
    change: changeType,
    preview: previewText,
    fields: changedFields.join(',')
  });

  const clickUrl = `/?${linkParams.toString()}`;

  const messageIds = await Promise.all(topics.map(topic => getMessaging().send({
    topic,
    notification,
    data,
    webpush: {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/icon.png',
        data: { url: clickUrl, ...data }
      },
      fcmOptions: { link: clickUrl }
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default' } }
    },
    android: { priority: 'high' }
  })));

  return { sent: true, topics, messageIds };
});

exports.sendTestScheduleNotification = onCall({ region: 'us-central1' }, async request => {
  if (isDemoFunctionEmulator) return { sent: false, emulatorOnly: true };
  if (request.auth?.token?.admin !== true) {
    throw new HttpsError('permission-denied', 'Administrator authentication is required.');
  }

  const token = requireToken(request);
  const academy = sanitizeAcademy(request.data?.academy);
  const date = requireText(request.data?.date, 'date', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new HttpsError('invalid-argument', 'The date must use YYYY-MM-DD format.');
  }

  const cycleName = request.data?.cycleName
    ? requireText(request.data.cycleName, 'cycle name', 40)
    : '';
  const changeType = requireText(request.data?.changeType, 'change type', 40);
  const previewText = optionalText(request.data?.previewText, 120);
  const targetId = requireText(request.data?.targetId, 'target ID', 100);
  const changedFields = Array.isArray(request.data?.changedFields)
    ? request.data.changedFields
        .filter(field => typeof field === 'string' && /^[a-zA-Z]+$/.test(field))
        .slice(0, 10)
    : [];

  const cycleText = cycleName ? `${cycleName} · ` : '';
  const notification = {
    title: `${academy} Test Notification`,
    body: `TEST ONLY · ${previewText || `${cycleText}${date} · ${changeType}`}`
  };
  const data = {
    type: 'schedule-update',
    academy,
    date,
    cycleName,
    changeType: `TEST ONLY · ${changeType}`,
    previewText: previewText ? `TEST ONLY · ${previewText}` : '',
    targetId,
    changedFields: changedFields.join(',')
  };

  const linkParams = new URLSearchParams({
    date,
    highlight: targetId,
    change: `TEST ONLY · ${changeType}`,
    preview: previewText ? `TEST ONLY · ${previewText}` : '',
    fields: changedFields.join(',')
  });

  const clickUrl = `/?${linkParams.toString()}`;

  const messageId = await getMessaging().send({
    token,
    notification,
    data,
    webpush: {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: '/icon.png',
        data: { url: clickUrl, ...data }
      },
      fcmOptions: { link: clickUrl }
    },
    apns: {
      headers: { 'apns-priority': '10' },
      payload: { aps: { sound: 'default' } }
    },
    android: { priority: 'high' }
  });

  return { sent: true, testOnly: true, messageId };
});

if (!isDemoFunctionEmulator) Object.assign(exports, require('./stagingRelay'));
}
