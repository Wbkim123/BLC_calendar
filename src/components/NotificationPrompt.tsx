import React, { useCallback, useEffect, useState } from 'react';
import { UserRole } from '../types/schedule';
import {
  disableNotifications,
  enableNotifications,
  getNotificationAvailability,
  isPhoneDevice,
  NotificationAvailability,
  syncNotificationSubscription
} from '../notifications';

interface Props {
  role: UserRole;
  cycleName?: string | null;
}

const AUTO_PROMPTED_KEY = 'blc_push_auto_prompted';

export default function NotificationPrompt({ role, cycleName }: Props) {
  const [status, setStatus] = useState<NotificationAvailability>('loading');
  const [busy, setBusy] = useState(false);
  const isPhone = isPhoneDevice();

  const requestNotificationPermission = useCallback(async () => {
    setBusy(true);
    try {
      await enableNotifications(role, cycleName);
      setStatus('granted');
    } catch (error: any) {
      setStatus(error?.message === 'denied' ? 'denied' : await getNotificationAvailability());
    } finally {
      setBusy(false);
    }
  }, [role, cycleName]);

  useEffect(() => {
    if (!isPhone) {
      disableNotifications(role, cycleName, false).catch(console.error);
      setStatus('unsupported');
      return;
    }
    getNotificationAvailability().then(setStatus);
  }, [isPhone, role, cycleName]);

  useEffect(() => {
    if (!isPhone || status !== 'granted') return;
    syncNotificationSubscription(role, cycleName).catch(console.error);
  }, [isPhone, role, cycleName, status]);

  useEffect(() => {
    if (!role || !isPhone || status !== 'prompt' || busy) return;
    if (window.localStorage.getItem(AUTO_PROMPTED_KEY) === 'true') return;

    window.localStorage.setItem(AUTO_PROMPTED_KEY, 'true');
    requestNotificationPermission();
  }, [role, isPhone, status, busy, requestNotificationPermission]);

  if (!role || status === 'loading' || status === 'unsupported' || status === 'unconfigured') return null;

  const handleDisable = async () => {
    setBusy(true);
    try {
      await disableNotifications(role, cycleName);
      setStatus('disabled');
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      setStatus(await getNotificationAvailability());
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
      onClick={status === 'granted' ? handleDisable : requestNotificationPermission}
      className={`w-full rounded-xl px-3 py-2 text-xs font-black shadow-sm transition-colors ${
        status === 'granted'
          ? 'border border-gray-300 bg-gray-200 text-gray-700 hover:bg-gray-300'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      {busy ? 'UPDATING...' : status === 'granted' ? 'NOTIFICATIONS OFF' : 'NOTIFICATIONS ON'}
    </button>
  );
}
