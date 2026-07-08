import React, { useEffect, useState } from 'react';
import { UserRole } from '../types/schedule';
import {
  disableNotifications,
  enableNotifications,
  getNotificationAvailability,
  NotificationAvailability,
  syncNotificationSubscription
} from '../notifications';

interface Props {
  role: UserRole;
  cycleName?: string | null;
}

export default function NotificationPrompt({ role, cycleName }: Props) {
  const [status, setStatus] = useState<NotificationAvailability>('loading');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getNotificationAvailability().then(setStatus);
  }, []);

  useEffect(() => {
    if (status !== 'granted') return;
    syncNotificationSubscription(role, cycleName).catch(console.error);
  }, [role, cycleName, status]);

  if (!role || status === 'loading' || status === 'unsupported' || status === 'unconfigured') return null;

  const handleEnable = async () => {
    setBusy(true);
    try {
      await enableNotifications(role, cycleName);
      setStatus('granted');
    } catch (error: any) {
      setStatus(error?.message === 'denied' ? 'denied' : await getNotificationAvailability());
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await disableNotifications();
      setStatus(Notification.permission === 'denied' ? 'denied' : 'prompt');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'needs-install') {
    return (
      <div className="w-full rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-center text-[11px] font-bold text-blue-900 shadow-sm">
        To receive schedule alerts on iPhone, tap Share → Add to Home Screen, then open the installed app.
      </div>
    );
  }

  if (status === 'denied') {
    return (
      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-[11px] font-bold text-amber-900 shadow-sm">
        Notifications are blocked. Enable them in your phone settings for BLC Tracker.
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={status === 'granted' ? handleDisable : handleEnable}
      className={`w-full rounded-xl px-3 py-2 text-xs font-black shadow-sm transition-colors ${
        status === 'granted'
          ? 'border border-green-200 bg-green-50 text-green-800'
          : 'bg-blue-700 text-white hover:bg-blue-600'
      }`}
    >
      {busy ? 'UPDATING...' : status === 'granted' ? 'SCHEDULE NOTIFICATIONS ON' : 'ENABLE SCHEDULE NOTIFICATIONS'}
    </button>
  );
}
