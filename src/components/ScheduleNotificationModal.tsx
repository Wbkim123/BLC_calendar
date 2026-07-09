import React, { useState } from 'react';
import { sendScheduleNotification, sendTestScheduleNotification } from '../notifications';

export type PendingScheduleNotification = {
  date: string;
  cycleName?: string | null;
  changeType: string;
  targetId: string;
  changedFields: string[];
};

interface Props {
  change: PendingScheduleNotification;
  onClose: () => void;
}

export default function ScheduleNotificationModal({ change, onClose }: Props) {
  const [sendToSgl, setSendToSgl] = useState(true);
  const [sendToStudents, setSendToStudents] = useState(Boolean(change.cycleName));
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
        recipients: { sgl: sendToSgl, students: sendToStudents }
      });
      onClose();
    } catch (sendError) {
      console.error('Failed to send schedule notification:', sendError);
      setError('Notification could not be sent. The schedule change was already saved.');
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
        recipients: { sgl: false, students: false }
      });
      onClose();
    } catch (sendError) {
      console.error('Failed to notify schedule managers:', sendError);
      setError('The schedule was saved, but managers could not be notified.');
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
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-200 p-3">
            <input
              type="checkbox"
              checked={sendToSgl}
              onChange={event => setSendToSgl(event.target.checked)}
              className="h-5 w-5"
            />
            <span className="font-bold text-gray-800">SGL users (9876)</span>
          </label>

          <label className={`flex items-center gap-3 rounded-xl border p-3 ${change.cycleName ? 'cursor-pointer border-gray-200' : 'cursor-not-allowed border-gray-100 opacity-50'}`}>
            <input
              type="checkbox"
              checked={sendToStudents}
              disabled={!change.cycleName}
              onChange={event => setSendToStudents(event.target.checked)}
              className="h-5 w-5"
            />
            <span className="font-bold text-gray-800">
              Students{change.cycleName ? ` — Cycle ${change.cycleName}` : ' — No cycle assigned'}
            </span>
          </label>

          <p className="text-xs font-semibold text-gray-500">Change: {change.changeType}</p>
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
          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
        </div>

        <div className="grid grid-cols-1 gap-3 bg-gray-50 p-4 sm:grid-cols-3">
          <button
            type="button"
            disabled={sending || testing}
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white py-3 font-bold text-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending || testing}
            onClick={handleSkip}
            className="rounded-xl bg-gray-200 py-3 font-bold text-gray-700 disabled:opacity-50"
          >
            Skip SGL / Students
          </button>
          <button
            type="button"
            disabled={sending || testing}
            onClick={handleSend}
            className="rounded-xl bg-blue-700 py-3 font-bold text-white shadow disabled:opacity-50"
          >
            {sending ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </div>
    </div>
  );
}
