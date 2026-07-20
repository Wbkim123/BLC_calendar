import React, { useState } from 'react';
import { sendScheduleNotification, sendTestScheduleNotification } from '../notifications';

const SHOW_TEST_DEVICE_BUTTON = false;

const getSendErrorMessage = (sendError: any) => {
  const code = sendError?.code || '';
  const message = sendError?.message || '';
  const combined = `${code} ${message}`.toLowerCase();

  if (combined.includes('permission-denied')) {
    return 'Notification was not sent. Please log out, log back in with code 2002, and try again.';
  }
  if (combined.includes('invalid-argument')) {
    return 'Notification was not sent because the saved change is missing required notification details.';
  }
  if (combined.includes('not-found')) {
    return 'Notification was not sent because the notification server function is not deployed yet.';
  }
  if (combined.includes('unavailable') || combined.includes('deadline')) {
    return 'Notification was not sent because Firebase is temporarily unavailable. Please try again.';
  }

  return 'Notification could not be sent. The schedule change was already saved.';
};

export type PendingScheduleNotification = {
  date: string;
  cycleName?: string | null;
  changeType: string;
  previewText?: string;
  targetId: string;
  changedFields: string[];
};

interface Props {
  change: PendingScheduleNotification;
  onClose: () => void;
}

export default function ScheduleNotificationModal({ change, onClose }: Props) {
  const isSglOnlyChange = change.targetId === 'sglNotes';
  const isPublicNotesChange = change.targetId === 'notes';
  const [sendingChoice, setSendingChoice] = useState<'yes' | 'no' | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [testMessage, setTestMessage] = useState('');

  const sendWithRecipients = async (
    recipients: { sgl: boolean; students: boolean },
    choice: 'yes' | 'no'
  ) => {
    setSendingChoice(choice);
    setError('');
    setTestMessage('');
    try {
      await sendScheduleNotification({
        ...change,
        recipients
      });
      onClose();
    } catch (sendError) {
      console.error('Failed to send schedule notification:', sendError);
      setError(getSendErrorMessage(sendError));
    } finally {
      setSendingChoice(null);
    }
  };

  const handleYes = () => {
    if (isPublicNotesChange) {
      sendWithRecipients({ sgl: true, students: Boolean(change.cycleName) }, 'yes');
      return;
    }
    if (isSglOnlyChange) {
      sendWithRecipients({ sgl: true, students: false }, 'yes');
      return;
    }
    sendWithRecipients({ sgl: true, students: Boolean(change.cycleName) }, 'yes');
  };

  const handleNo = () => {
    if (isPublicNotesChange) {
      sendWithRecipients({ sgl: true, students: false }, 'no');
      return;
    }
    sendWithRecipients({ sgl: false, students: false }, 'no');
  };

  const handleTestMyDevice = async () => {
    setTesting(true);
    setError('');
    setTestMessage('');
    try {
      await sendTestScheduleNotification(change);
      window.dispatchEvent(new CustomEvent('blc-schedule-notification', { detail: change }));
      setTestMessage('Test notification sent to this device only.');
      onClose();
    } catch (sendError: any) {
      console.error('Failed to send test notification:', sendError);
      const code = sendError?.code || sendError?.message || '';
      if (code.includes('permission-required')) {
        setError('Turn on notifications on this device first, then try the test again.');
      } else if (code.includes('permission-denied')) {
        setError('Admin authentication is required. Log out, log back in with 2002, then try again.');
      } else if (code.includes('unsupported')) {
        setError('This device/browser cannot receive web push notifications.');
      } else {
        setError('Test notification could not be sent to this device.');
      }
    } finally {
      setTesting(false);
    }
  };

  const question = isSglOnlyChange
    ? 'Send notification to all SGLs?'
    : isPublicNotesChange
      ? 'Send notification to all students?'
      : 'Send notification to SGLs and students?';

  const description = isSglOnlyChange
    ? 'Yes sends to SGLs and managers. No sends to managers only.'
    : isPublicNotesChange
      ? 'SGLs and managers are notified automatically. Choose whether students should also be notified.'
      : change.cycleName
        ? `Yes sends to SGLs, managers, and Cycle ${change.cycleName}. No sends to managers only.`
        : 'No cycle is assigned. Yes sends to SGLs and managers only.';

  const disableYes = isPublicNotesChange && !change.cycleName;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="soft-modal w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="soft-modal-header bg-blue-900 p-4 text-white">
          <h2 className="text-lg font-black">Schedule Saved</h2>
          <p className="mt-1 text-xs text-blue-200">Choose whether to send a notification for {change.date}.</p>
        </div>

        <div className="space-y-3 p-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm font-bold text-blue-900">
            Schedule managers (2002) are always notified.
            {isPublicNotesChange && (
              <div className="mt-1 text-xs text-blue-700">
                Public notes also notify all SGL users automatically.
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3">
            <div className="text-sm font-black text-gray-900">{question}</div>
            <div className="mt-1 text-[11px] font-semibold text-gray-500">
              {disableYes ? 'No cycle is assigned, so students cannot be selected.' : description}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={sendingChoice !== null || testing}
                onClick={handleNo}
                className="rounded-lg bg-gray-700 py-2 text-xs font-black text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingChoice === 'no' ? 'Sending...' : 'No'}
              </button>
              <button
                type="button"
                disabled={sendingChoice !== null || testing || disableYes}
                onClick={handleYes}
                className="rounded-lg bg-green-600 py-2 text-xs font-black text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingChoice === 'yes' ? 'Sending...' : 'Yes'}
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-500">
            Change: {change.previewText || change.changeType}
          </p>

          {SHOW_TEST_DEVICE_BUTTON && (
            <>
              <button
                type="button"
                disabled={sendingChoice !== null || testing}
                onClick={handleTestMyDevice}
                className="w-full rounded-xl border border-purple-200 bg-purple-50 px-3 py-2 text-xs font-black text-purple-800 transition-colors hover:bg-purple-100 disabled:opacity-50"
              >
                {testing ? 'Sending test...' : 'Test My Device Only'}
              </button>
              <p className="text-[11px] font-semibold text-gray-500">
                Test mode sends directly to this device token only. It does not notify managers, SGL users, or students.
              </p>
              {testMessage && <p className="text-xs font-bold text-green-700">{testMessage}</p>}
            </>
          )}

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
