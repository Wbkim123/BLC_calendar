const { createHash } = require('node:crypto');

const buildStagingMessage = (input, claims, approvedHash) => {
  if (claims?.staging !== true || claims?.admin !== true || claims?.scope !== 'NCOA' || claims?.uid !== 'ncoa-staging-manager') {
    throw new Error('Staging authentication is required.');
  }
  if (typeof input?.token !== 'string' || input.token.length < 20 || input.token.length > 4096) {
    throw new Error('A device token is required.');
  }
  const hash = createHash('sha256').update(input.token).digest('hex');
  if (!approvedHash || hash !== approvedHash.trim()) throw new Error(`Approve test device: ${hash}`);
  if (!['BLC', 'KTA'].includes(input.academy)) throw new Error('A valid academy is required.');
  const welcome = input.kind === 'welcome';
  if (!welcome && (input.kind !== 'schedule' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date || '') ||
      typeof input.targetId !== 'string' || !input.targetId || input.targetId.length > 100)) {
    throw new Error('A valid test schedule is required.');
  }
  const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
  // Explicit allowlist: never copy topic/condition/notification from the caller.
  return {
    token: input.token,
    notification: {
      title: welcome ? 'Test environment connected' : `${input.academy} Test Notification`,
      body: welcome ? 'Notifications are enabled for this test device.' :
        `TEST ONLY · ${text(input.previewText, 120) || text(input.changeType, 40) || input.date}`
    },
    data: {
      environment: 'staging', type: welcome ? 'test-welcome' : 'schedule-update',
      academy: input.academy, date: welcome ? '' : input.date,
      targetId: welcome ? '' : input.targetId,
      cycleName: text(input.cycleName, 40), changeType: text(input.changeType, 40),
      previewText: text(input.previewText, 120),
      changedFields: Array.isArray(input.changedFields)
        ? input.changedFields.filter(field => typeof field === 'string' && /^[a-zA-Z]+$/.test(field)).slice(0, 10).join(',') : ''
    },
    android: { priority: 'high' },
    apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default' } } }
  };
};
module.exports = { buildStagingMessage };
