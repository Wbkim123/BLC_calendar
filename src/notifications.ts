import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { app, auth } from './firebase';
import { UserRole } from './types/schedule';

const PUSH_TOKEN_KEY = 'blc_push_token';
const PUSH_TOPIC_KEY = 'blc_push_topic';
const PUSH_DISABLED_KEY = 'blc_push_disabled';
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY
  || 'BHhrU-r2LR0CQuEHSoy4qzLXmFJRGV_35MJANS-pQfExxsnGRNFNWQO5vnUl2YtcejkyeDBc-2_pgKmDaWnjklc';
const functions = getFunctions(app, 'us-central1');
const isNativePlatform = () => Capacitor.isNativePlatform();
const NATIVE_NOTIFICATION_TIMEOUT_MS = 15000;

const withNativeNotificationTimeout = <T>(promise: Promise<T>, operation: string): Promise<T> => {
  let timeoutId: number;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(
      () => reject(new Error(`notification-${operation}-timeout`)),
      NATIVE_NOTIFICATION_TIMEOUT_MS
    );
  });

  return Promise.race([promise, timeout]).finally(() => window.clearTimeout(timeoutId));
};

const callNativeFunction = async <T>(name: string, data: Record<string, unknown>): Promise<T> => {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(
    () => abortController.abort(),
    NATIVE_NOTIFICATION_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `https://us-central1-blc-calendar-e302f.cloudfunctions.net/${name}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
        signal: abortController.signal
      }
    );
    const payload = await response.json().catch(() => null) as {
      result?: T;
      error?: { message?: string };
    } | null;
    if (!response.ok || payload?.error || payload?.result === undefined) {
      throw new Error(payload?.error?.message || `notification-${name}`);
    }
    return payload.result;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const isPhoneDevice = () => {
  if (isNativePlatform()) return true;
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent;
  return /iPhone|iPod/i.test(userAgent) || (/Android/i.test(userAgent) && /Mobile/i.test(userAgent));
};

export type NotificationRecipients = {
  sgl: boolean;
  students: boolean;
};

export async function createAdminSession(code: string) {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), 15000);
  let response: Response;

  try {
    response = await fetch(
      'https://us-central1-blc-calendar-e302f.cloudfunctions.net/createAdminSession',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { code } }),
        signal: abortController.signal
      }
    );
  } finally {
    window.clearTimeout(timeoutId);
  }

  const payload = await response.json().catch(() => null) as {
    result?: { token?: string };
    error?: { message?: string };
  } | null;
  if (!response.ok || payload?.error) throw new Error(payload?.error?.message || 'admin-session');

  const data = payload?.result;
  if (!data?.token) throw new Error('admin-session');

  // Authentication can finish in the background; the verified function
  // response is enough to continue past the login screen on iOS.
  void signInWithCustomToken(auth, data.token).catch(error => {
    console.error('Failed to attach Firebase administrator credentials:', error);
  });
}

export async function sendScheduleNotification(details: {
  date: string;
  cycleName?: string | null;
  changeType: string;
  previewText?: string;
  targetId: string;
  changedFields: string[];
  recipients: NotificationRecipients;
}) {
  await httpsCallable(functions, 'sendScheduleNotification')(details);
}

export async function getCurrentDevicePushToken() {
  if (isNativePlatform()) {
    const permission = await FirebaseMessaging.checkPermissions();
    if (permission.receive !== 'granted') throw new Error('permission-required');
    const { token } = await FirebaseMessaging.getToken();
    if (!token) throw new Error('token');
    window.localStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  }

  if (!VAPID_KEY) throw new Error('unconfigured');
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
    throw new Error('unsupported');
  }
  if (Notification.permission !== 'granted') throw new Error('permission-required');

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await registration.update().catch(() => undefined);
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });
  if (!token) throw new Error('token');
  window.localStorage.setItem(PUSH_TOKEN_KEY, token);
  return token;
}

export async function sendTestScheduleNotification(details: {
  date: string;
  cycleName?: string | null;
  changeType: string;
  previewText?: string;
  targetId: string;
  changedFields: string[];
}) {
  const token = await getCurrentDevicePushToken();
  await httpsCallable(functions, 'sendTestScheduleNotification')({
    ...details,
    token
  });
}

export type NotificationAvailability =
  | 'loading'
  | 'unconfigured'
  | 'unsupported'
  | 'needs-install'
  | 'prompt'
  | 'disabled'
  | 'granted'
  | 'denied';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function getNotificationAvailability(): Promise<NotificationAvailability> {
  if (!isPhoneDevice()) return 'unsupported';
  if (window.localStorage.getItem(PUSH_DISABLED_KEY) === 'true') return 'disabled';

  if (isNativePlatform()) {
    const permission = await FirebaseMessaging.checkPermissions();
    if (permission.receive === 'granted') return 'granted';
    if (permission.receive === 'denied') return 'denied';
    return 'prompt';
  }

  if (!VAPID_KEY) return 'unconfigured';
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !(await isSupported())) {
    return 'unsupported';
  }
  if (isIos() && !isStandalone()) return 'needs-install';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return 'prompt';
}

export async function enableNotifications(role: UserRole, cycleName?: string | null) {
  if (!isPhoneDevice()) throw new Error('unsupported');

  if (isNativePlatform()) {
    const permission = await withNativeNotificationTimeout(
      FirebaseMessaging.requestPermissions(),
      'permission'
    );
    if (permission.receive !== 'granted') throw new Error('denied');

    const { token } = await withNativeNotificationTimeout(
      FirebaseMessaging.getToken(),
      'token'
    );
    if (!token) throw new Error('token');

    const subscription = await callNativeFunction<{ subscribed?: boolean; topic?: string | null }>(
      'registerPushToken',
      {
        token,
        role: role || 'UNKNOWN',
        cycleName: cycleName || null,
        platform: `${Capacitor.getPlatform()}-native`,
        previousTopic: window.localStorage.getItem(PUSH_TOPIC_KEY)
      }
    );
    window.localStorage.setItem(PUSH_TOKEN_KEY, token);
    if (subscription.topic) {
      window.localStorage.setItem(PUSH_TOPIC_KEY, subscription.topic);
    } else {
      window.localStorage.removeItem(PUSH_TOPIC_KEY);
    }
    window.localStorage.removeItem(PUSH_DISABLED_KEY);
    return;
  }

  const availability = await getNotificationAvailability();
  if (availability === 'unconfigured' || availability === 'unsupported' || availability === 'needs-install') {
    throw new Error(availability);
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  await registration.update().catch(() => undefined);
  const token = await getToken(getMessaging(app), {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration
  });
  if (!token) throw new Error('token');

  const result = await httpsCallable(functions, 'registerPushToken')({
    token,
    role: role || 'UNKNOWN',
    cycleName: cycleName || null,
    platform: isIos() ? 'ios-web' : 'web',
    previousTopic: window.localStorage.getItem(PUSH_TOPIC_KEY)
  });
  const subscription = result.data as { subscribed?: boolean; topic?: string | null };
  window.localStorage.setItem(PUSH_TOKEN_KEY, token);
  if (subscription.topic) {
    window.localStorage.setItem(PUSH_TOPIC_KEY, subscription.topic);
  } else {
    window.localStorage.removeItem(PUSH_TOPIC_KEY);
  }
  window.localStorage.removeItem(PUSH_DISABLED_KEY);
}

export async function syncNotificationSubscription(role: UserRole, cycleName?: string | null) {
  if (isNativePlatform()) {
    const permission = await FirebaseMessaging.checkPermissions();
    if (permission.receive !== 'granted') return;
    await enableNotifications(role, cycleName);
    return;
  }

  if (Notification.permission !== 'granted' || !window.localStorage.getItem(PUSH_TOKEN_KEY)) return;
  await enableNotifications(role, cycleName);
}

async function disableNotificationsInternal(
  role?: UserRole,
  cycleName?: string | null,
  recoverMissingToken = true,
  deleteNativeToken = true
) {
  let token = window.localStorage.getItem(PUSH_TOKEN_KEY);
  const topic = window.localStorage.getItem(PUSH_TOPIC_KEY);

  if (!token && recoverMissingToken) {
    if (isNativePlatform()) {
      const permission = await FirebaseMessaging.checkPermissions();
      if (permission.receive === 'granted') {
        token = (await FirebaseMessaging.getToken()).token;
      }
    } else if (Notification.permission === 'granted') {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      await registration.update().catch(() => undefined);
      token = await getToken(getMessaging(app), {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
    }
  }
  let unregisterError: unknown;
  if (token) {
    try {
      if (isNativePlatform()) {
        await callNativeFunction('unregisterPushToken', { token, topic, role, cycleName });
      } else {
        await httpsCallable(functions, 'unregisterPushToken')({ token, topic, role, cycleName });
      }
    } catch (error) {
      unregisterError = error;
    }
    if (isNativePlatform() && deleteNativeToken) {
      await FirebaseMessaging.deleteToken().catch(error => {
        console.error('Failed to delete the native FCM token:', error);
      });
    } else if (!isNativePlatform()) {
      await deleteToken(getMessaging(app)).catch(error => {
        console.error('Failed to delete the local FCM token:', error);
      });
    }
  }
  window.localStorage.removeItem(PUSH_TOKEN_KEY);
  window.localStorage.removeItem(PUSH_TOPIC_KEY);
  window.localStorage.setItem(PUSH_DISABLED_KEY, 'true');
  if (unregisterError) throw unregisterError;
}

export async function disableNotifications(
  role?: UserRole,
  cycleName?: string | null,
  recoverMissingToken = true,
  deleteNativeToken = true
) {
  const operation = disableNotificationsInternal(
    role,
    cycleName,
    recoverMissingToken,
    deleteNativeToken
  );
  if (!isNativePlatform()) return operation;

  try {
    await withNativeNotificationTimeout(operation, 'disable');
  } catch (error) {
    // Never leave the native toggle stuck ON because APNs/FCM cleanup is slow.
    // The underlying cleanup promise continues and can finish in the background.
    window.localStorage.removeItem(PUSH_TOKEN_KEY);
    window.localStorage.removeItem(PUSH_TOPIC_KEY);
    window.localStorage.setItem(PUSH_DISABLED_KEY, 'true');
    throw error;
  }
}

export async function listenForForegroundNotifications() {
  if (!isPhoneDevice()) return () => undefined;

  if (isNativePlatform()) {
    const getNotificationDetail = (data: unknown) => {
      const payload = data && typeof data === 'object'
        ? data as Record<string, unknown>
        : {};
      const value = (key: string) => typeof payload[key] === 'string' ? payload[key] as string : '';
      return {
        date: value('date'),
        targetId: value('targetId'),
        changeType: value('changeType'),
        previewText: value('previewText'),
        changedFields: value('changedFields').split(',').filter(Boolean)
      };
    };
    const dispatchNotification = (data: unknown) => {
      const detail = getNotificationDetail(data);
      if (!detail.date || !detail.targetId) return;
      window.dispatchEvent(new CustomEvent('blc-schedule-notification', { detail }));
    };

    const receivedListener = await FirebaseMessaging.addListener('notificationReceived', event => {
      dispatchNotification(event.notification.data);
    });
    const actionListener = await FirebaseMessaging.addListener('notificationActionPerformed', event => {
      dispatchNotification(event.notification.data);
    });

    return () => {
      void receivedListener.remove();
      void actionListener.remove();
    };
  }

  if (!(await isSupported())) return () => undefined;
  return onMessage(getMessaging(app), payload => {
    if (Notification.permission !== 'granted') return;
    const notificationDetail = {
      date: payload.data?.date || '',
      targetId: payload.data?.targetId || '',
      changeType: payload.data?.changeType || '',
      previewText: payload.data?.previewText || '',
      changedFields: (payload.data?.changedFields || '').split(',').filter(Boolean)
    };
    window.dispatchEvent(new CustomEvent('blc-schedule-notification', { detail: notificationDetail }));

    const title = payload.notification?.title || 'BLC Schedule Updated';
    const date = payload.data?.date;
    const targetId = payload.data?.targetId;
    const changeType = payload.data?.changeType;
    const previewText = payload.data?.previewText;
    const changedFields = payload.data?.changedFields;
    const params = new URLSearchParams();
    if (date) params.set('date', date);
    if (targetId) params.set('highlight', targetId);
    if (changeType) params.set('change', changeType);
    if (previewText) params.set('preview', previewText);
    if (changedFields) params.set('fields', changedFields);
    const url = params.size > 0 ? `/?${params.toString()}` : '/';

    navigator.serviceWorker.ready
      .then(registration => registration.showNotification(title, {
        body: payload.notification?.body || 'A schedule was updated.',
        icon: '/icon.png',
        data: {
          url,
          date: date || '',
          targetId: targetId || '',
          changeType: changeType || '',
          previewText: previewText || '',
          changedFields: changedFields || ''
        }
      }))
      .catch(() => {
        const notification = new Notification(title, {
          body: payload.notification?.body || 'A schedule was updated.',
          icon: '/icon.png',
          data: { url }
        });
        notification.onclick = () => {
          window.location.href = url;
        };
      });
  });
}
