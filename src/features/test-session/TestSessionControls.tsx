import React, { useState } from 'react';
import { sendTestScheduleNotification } from '../../notifications';
import { getTestNotificationTargets, getTestViewOptions, TestViewId } from './testAccessProfiles';

interface Props {
  activeStudentCycles: string[];
  viewId: TestViewId;
  onViewChange: (viewId: TestViewId) => void;
}

const todayLocal = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export default function TestSessionControls({ activeStudentCycles, viewId, onViewChange }: Props) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const options = getTestViewOptions(activeStudentCycles);
  const notificationTargets = getTestNotificationTargets(viewId);
  const notificationTargetSummary = notificationTargets.length
    ? notificationTargets.map(target => target.audienceLabel).join(' + ')
    : 'TV display does not receive schedule notifications';

  const sendTest = async () => {
    if (sending) return;
    setSending(true);
    setMessage('');
    try {
      let sent = 0;
      let lastError: any;
      for (const target of notificationTargets) {
        try {
          await sendTestScheduleNotification({
            academy: target.academy,
            date: todayLocal(),
            cycleName: target.cycleName,
            changeType: 'Test notification',
            previewText: `TEST AUDIENCE: ${target.audienceLabel}`,
            targetId: 'test-session-notification',
            changedFields: ['eventName']
          });
          sent += 1;
        } catch (error) {
          lastError = error;
          break;
        }
      }
      if (sent === notificationTargets.length && sent > 0) {
        setMessage(`${sent} audience test${sent === 1 ? '' : 's'} sent to this device only.`);
      } else if (sent > 0) {
        setMessage(`${sent} of ${notificationTargets.length} audience tests sent. The next test failed; check device approval and notification settings.`);
      } else if (lastError) {
        throw lastError;
      } else {
        setMessage('This view does not receive schedule notifications.');
      }
    } catch (error: any) {
      const errorCode = `${error?.code || ''} ${error?.message || ''}`;
      if (/Approve test device: [a-f0-9]{64}/i.test(errorCode)) {
        setMessage(errorCode.match(/Approve test device: [a-f0-9]{64}/i)?.[0] || 'This device needs approval.');
      } else if (errorCode.includes('permission-required')) {
        setMessage('Turn on notifications for this device first, then try again.');
      } else if (errorCode.includes('unsupported')) {
        setMessage('This browser cannot receive push notifications. Try the installed phone web app.');
      } else {
        setMessage('Test notification failed. Confirm this device is approved and notifications are enabled.');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="settings-card rounded-2xl border border-amber-300 bg-amber-50 p-4" aria-label="Test session controls">
      <div className="text-sm font-black text-amber-950">Test as</div>
      <p className="mt-1 text-[11px] font-semibold text-amber-800">
        Switch views without signing in again. Schedule changes stay in the staging database.
      </p>
      <select
        aria-label="Preview access role"
        value={options.some(option => option.id === viewId) ? viewId : 'test-manager'}
        onChange={event => onViewChange(event.target.value as TestViewId)}
        className="mt-3 w-full rounded-xl border border-amber-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-900"
      >
        {options.map(option => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
      <p className="mt-2 text-[10px] font-bold text-amber-900">Notification audience to preview: {notificationTargetSummary}</p>
      <button
        type="button"
        onClick={sendTest}
        disabled={sending || notificationTargets.length === 0}
        className="mt-3 w-full rounded-xl bg-amber-800 px-3 py-2.5 text-xs font-black text-white disabled:opacity-60"
      >
        {sending ? 'SENDING…' : 'SEND TEST NOTIFICATION TO THIS DEVICE'}
      </button>
      <p className="mt-2 text-[10px] font-semibold text-amber-900">
        These previews show each role’s intended academy/cycle. Delivery is only to this approved device; other users and role subscriptions are not contacted or simulated.
      </p>
      {message && <p role="status" className="mt-2 break-all text-xs font-bold text-amber-950">{message}</p>}
    </section>
  );
}
