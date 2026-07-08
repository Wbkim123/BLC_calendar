import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { app, auth } from './firebase';
import { UserRole } from './types/schedule';

const PUSH_TOKEN_KEY = 'blc_push_token';
const PUSH_TOPIC_KEY = 'blc_push_topic';
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY
  || 'BHhrU-r2LR0CQuEHSoy4qzLXmFJRGV_35MJANS-pQfExxsnGRNFNWQO5vnUl2YtcejkyeDBc-2_pgKmDaWnjklc';
const functions = getFunctions(app, 'us-central1');

export type NotificationRecipients = {
  sgl: boolean;
  students: boolean;
};

export async function createAdminSession(code: string) {
  const result = await httpsCallable(functions, 'createAdminSession')({ code });
  const data = result.data as { token?: string };
  if (!data.token) throw new Error('admin-session');
  await signInWithCustomToken(auth, data.token);
}

export async function sendScheduleNotification(details: {
  date: string;
  cycleName?: string | null;
  changeType: string;
  targetId: string;
  recipients: NotificationRecipients;
}) {
  await httpsCallable(functions, 'sendScheduleNotification')(details);
}

export type NotificationAvailability =
  | 'loading'
  | 'unconfigured'
  | 'unsupported'
  | 'needs-install'
  | 'prompt'
  | 'granted'
  | 'denied';

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export async function getNotificationAvailability(): Promise<NotificationAvailability> {
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
  const availability = await getNotificationAvailability();
  if (availability === 'unconfigured' || availability === 'unsupported' || availability === 'needs-install') {
    throw new Error(availability);
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('denied');

  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
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
}

export async function syncNotificationSubscription(role: UserRole, cycleName?: string | null) {
  if (Notification.permission !== 'granted' || !window.localStorage.getItem(PUSH_TOKEN_KEY)) return;
  await enableNotifications(role, cycleName);
}

export async function disableNotifications() {
  const token = window.localStorage.getItem(PUSH_TOKEN_KEY);
  const topic = window.localStorage.getItem(PUSH_TOPIC_KEY);
  if (token) await httpsCallable(functions, 'unregisterPushToken')({ token, topic });
  window.localStorage.removeItem(PUSH_TOKEN_KEY);
  window.localStorage.removeItem(PUSH_TOPIC_KEY);
}

export async function listenForForegroundNotifications() {
  if (!(await isSupported())) return () => undefined;
  return onMessage(getMessaging(app), payload => {
    if (Notification.permission !== 'granted') return;
    const title = payload.notification?.title || 'BLC Schedule Updated';
    const notification = new Notification(title, {
      body: payload.notification?.body || 'A schedule was updated.',
      icon: '/icon.png'
    });
    notification.onclick = () => {
      const date = payload.data?.date;
      const targetId = payload.data?.targetId;
      const changeType = payload.data?.changeType;
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      if (targetId) params.set('highlight', targetId);
      if (changeType) params.set('change', changeType);
      window.location.href = params.size > 0 ? `/?${params.toString()}` : '/';
    };
  });
}
