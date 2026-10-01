const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineString } = require('firebase-functions/params');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getMessaging } = require('firebase-admin/messaging');
const { buildStagingMessage } = require('./stagingPushPolicy');

const allowedTokenHash = defineString('STAGING_PUSH_TOKEN_SHA256', { default: 'disabled' });
let stagingAuth;
exports.relayStagingNotification = onCall({ region: 'us-central1', maxInstances: 2 }, async request => {
  if (process.env.GCLOUD_PROJECT !== 'blc-calendar-e302f' || process.env.FUNCTIONS_EMULATOR === 'true') {
    throw new HttpsError('failed-precondition', 'Test relay is disabled in this environment.');
  }
  if (!stagingAuth) stagingAuth = getAuth(initializeApp({ projectId: 'ncoa-calendar-staging' }, 'staging-token-verifier'));
  let claims;
  try {
    claims = await stagingAuth.verifyIdToken(request.data?.stagingIdToken || '');
  } catch {
    throw new HttpsError('unauthenticated', 'Staging authentication is required.');
  }
  let message;
  try { message = buildStagingMessage(request.data, claims, allowedTokenHash.value()); }
  catch (error) { throw new HttpsError('permission-denied', error.message); }
  const messageId = await getMessaging().send(message);
  return { sent: true, testOnly: true, messageId };
});
