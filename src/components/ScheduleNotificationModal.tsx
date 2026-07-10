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
  const [sendToSgl, setSendToSgl] = useState(true);
  const [sendToStudents, setSendToStudents] = useState(Boolean(change.cycleName) && !isSglOnlyChange);
  const [sending, setSending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [testMessage, setTestMessage] = useState('');

  const handleSend = async () => {
    setSending(true);
    setError('');
    setTestMessage('');
    try {
      await sendScheduleNotification({
        ...change,
        recipients: {
          sgl: isPublicNotesChange ? true : sendToSgl,
          students: sendToStudents
        }
      });
      onClose();
    } catch (sendError) {
      console.error('Failed to send schedule notification:', sendError);
      setError(getSendErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  };

  const handleSkip = async () => {
    setSending(true);
    setError('');
    setTestMessage('');
    try {
      await sendScheduleNotification({
        ...change,
        recipients: {
          sgl: isPublicNotesChange,
          students: false
        }
      });
      onClose();
    } catch (sendError) {
      console.error('Failed to notify schedule managers:', sendError);
      setError(getSendErrorMessage(sendError));
    } finally {
      setSending(false);
    }
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

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-blue-900 p-4 text-white">
          <h2 className="text-lg font-black">Schedule Saved</h2>
          <p className="mt-1 text-xs text-blue-200">Send a notification for {change.date}?</p>
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

          {!isPublicNotesChange && (
            <AudienceChoice
              question={isSglOnlyChange
                ? 'Send notification to all SGLs?'
                : 'Send notification to SGL users?'}
              description={isSglOnlyChange
                ? 'SGL-only notes are hidden from students.'
                : 'SGL users can view this schedule change.'}
              value={sendToSgl}
              onChange={setSendToSgl}
            />
          )}

          {!isSglOnlyChange && (
            <AudienceChoice
              question={isPublicNotesChange
                ? 'Send notification to all students?'
                : 'Send notification to students?'}
              description={change.cycleName
                ? `Cycle ${change.cycleName}`
                : 'No cycle is assigned, so students cannot be selected.'}
              value={sendToStudents}
              onChange={setSendToStudents}
              disabled={!change.cycleName}
            />
          )}

          <label className={`hidden items-center gap-3 rounded-xl border p-3 ${change.cycleName && !isSglOnlyChange ? 'cursor-pointer border-gray-200' : 'cursor-not-allowed border-gray-100 opacity-50'}`}>
            <input
              type="checkbox"
              checked={sendToStudents}
              disabled={!change.cycleName || isSglOnlyChange}
              onChange={event => setSendToStudents(event.target.checked)}
              className="h-5 w-5"
            />
            <span className="font-bold text-gray-800">
              {isSglOnlyChange
                ? 'Students — hidden for SGL-only notes'
                : change.cycleName
                  ? `Students — Cycle ${change.cycleName}`
                  : 'Students — No cycle assigned'}
            </span>
            <span className="hidden">
              Students{change.cycleName ? ` — Cycle ${change.cycleName}` : ' — No cycle assigned'}
            </span>
          </label>

          <p className="text-xs font-semibold text-gray-500">
            Change: {change.previewText || change.changeType}
          </p>
          {SHOW_TEST_DEVICE_BUTTON && (
            <>
              <button
                type="button"
                disabled={sending || testing}
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

        <div className="flex gap-3 bg-gray-50 p-4">
          <button
            type="button"
            disabled={sending || testing}
            onClick={handleSkip}
            className="flex-1 rounded-xl bg-gray-200 py-3 font-bold text-gray-700 disabled:opacity-50"
          >
            {isPublicNotesChange ? 'Skip Students' : 'Notify Managers Only'}
          </button>
          <button
            type="button"
            disabled={sending || testing}
            onClick={handleSend}
            className="flex-1 rounded-xl bg-blue-700 py-3 font-bold text-white shadow disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AudienceChoice({
  question,
  description,
  value,
  onChange,
  disabled = false
}: {
  question: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${disabled ? 'border-gray-100 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'}`}>
      <div className="text-sm font-black text-gray-900">{question}</div>
      <div className="mt-1 text-[11px] font-semibold text-gray-500">{description}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(true)}
          className={`rounded-lg py-2 text-xs font-black transition-colors disabled:cursor-not-allowed ${
            value
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Yes
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(false)}
          className={`rounded-lg py-2 text-xs font-black transition-colors disabled:cursor-not-allowed ${
            !value
              ? 'bg-gray-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          No
        </button>
      </div>
    </div>
  );
}
