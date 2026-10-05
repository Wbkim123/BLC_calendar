import { stagingConfig, isStagingSession, getSessionGeneration, stagingAuth, stagingFunctions, ensureStagingAuthPersistence } from './staging';
import { deleteToken, getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import { app, auth, functions, useFirebaseEmulators } from './firebase';
import { UserRole } from './types/schedule';
import { AcademyId } from './types/academy';

const PUSH_TOKEN_KEY = 'blc_push_token';
const PUSH_TOPIC_KEY = 'blc_push_topic';
const PUSH_DISABLED_KEY = 'blc_push_disabled';
const ADMIN_ID_TOKEN_KEY = 'blc_admin_id_token';
const ADMIN_REFRESH_TOKEN_KEY = 'blc_admin_refresh_token';
const PRODUCTION_FIREBASE_API_KEY = 'AIzaSyDNjoIVSKyIRjFm7LQD-yH7pemRZ7c_nyc';
const VAPID_KEY = process.env.REACT_APP_FIREBASE_VAPID_KEY
  || 'BHhrU-r2LR0CQuEHSoy4qzLXmFJRGV_35MJANS-pQfExxsnGRNFNWQO5vnUl2YtcejkyeDBc-2_pgKmDaWnjklc';
const getFirebaseApiKey = () => isStagingSession() ? stagingConfig.apiKey : PRODUCTION_FIREBASE_API_KEY;
const authStorageKey = (key: string, staging = isStagingSession()) => staging ? `staging_${key}` : key;
const functionBaseUrl = () => `https://us-central1-${isStagingSession() ? stagingConfig.projectId : 'blc-calendar-e302f'}.cloudfunctions.net`;
const activeFunctions = () => isStagingSession() ? stagingFunctions : functions;
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

const callNativeFunction = async <T>(
  name: string,
  data: Record<string, unknown>,
  idToken?: string
): Promise<T> => {
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(
    () => abortController.abort(),
    NATIVE_NOTIFICATION_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      `${functionBaseUrl()}/${name}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {})
        },
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

const refreshNativeAdminIdToken = async () => {
  const generation = getSessionGeneration();
  const refreshToken = window.localStorage.getItem(authStorageKey(ADMIN_REFRESH_TOKEN_KEY));
  if (!refreshToken) return window.localStorage.getItem(authStorageKey(ADMIN_ID_TOKEN_KEY));

  const response = await withNativeNotificationTimeout(
    fetch(`https://securetoken.googleapis.com/v1/token?key=${getFirebaseApiKey()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }).toString()
    }),
    'admin-auth'
  );
  const payload = await response.json().catch(() => null) as {
    id_token?: string;
    refresh_token?: string;
    error?: { message?: string };
  } | null;
  if (!response.ok || !payload?.id_token) {
    throw new Error(payload?.error?.message || 'permission-denied');
  }
  if (generation !== getSessionGeneration()) throw new Error('Session changed.');
  window.localStorage.setItem(authStorageKey(ADMIN_ID_TOKEN_KEY), payload.id_token);
  if (payload.refresh_token) {
    window.localStorage.setItem(authStorageKey(ADMIN_REFRESH_TOKEN_KEY), payload.refresh_token);
  }
  return payload.id_token;
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

export async function prepareNotificationEnvironment(staging: boolean) {
  if (!isNativePlatform() || useFirebaseEmulators) return;
  const next = staging ? 'staging' : 'production';
  const previous = window.localStorage.getItem('blc_push_environment') || 'production';
  if (previous !== next) {
    // Rotating when crossing environments discards every old topic subscription.
    await withNativeNotificationTimeout(FirebaseMessaging.deleteToken(), 'reset');
    window.localStorage.removeItem(PUSH_TOKEN_KEY);
    window.localStorage.removeItem(PUSH_TOPIC_KEY);
  }
  window.localStorage.setItem('blc_push_environment', next);
  if (staging) {
    window.localStorage.removeItem('staging_push_ready');
    window.localStorage.removeItem('staging_push_auto_prompted');
    window.localStorage.removeItem(PUSH_DISABLED_KEY);
  }
}

export async function createAdminSession(code: string) {
  if (useFirebaseEmulators) throw new Error('Local emulator sessions do not use production access codes.');
  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => abortController.abort(), 15000);
  let response: Response;

  try {
    response = await fetch(
      `${functionBaseUrl()}/createAdminSession`,
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
    result?: { token?: string; testMode?: boolean; scope?: string };
    error?: { message?: string };
  } | null;
  if (!response.ok || payload?.error) throw new Error(payload?.error?.message || 'admin-session');

  const data = payload?.result;
  if (!data?.token) throw new Error('admin-session');
  if (isStagingSession() && (data.testMode !== true || data.scope !== 'NCOA')) throw new Error('staging-session');

  if (isNativePlatform()) {
    await prepareNotificationEnvironment(isStagingSession());
    const authResponse = await withNativeNotificationTimeout(
      fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${getFirebaseApiKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: data.token, returnSecureToken: true })
        }
      ),
      'admin-auth'
    );
    const authPayload = await authResponse.json().catch(() => null) as {
      idToken?: string;
      refreshToken?: string;
      error?: { message?: string };
    } | null;
    if (!authResponse.ok || !authPayload?.idToken) {
      throw new Error(authPayload?.error?.message || 'admin-auth');
    }
    window.localStorage.setItem(authStorageKey(ADMIN_ID_TOKEN_KEY), authPayload.idToken);
    if (authPayload.refreshToken) {
      window.localStorage.setItem(authStorageKey(ADMIN_REFRESH_TOKEN_KEY), authPayload.refreshToken);
    }
    return;
  }

  if (isStagingSession()) {
    await ensureStagingAuthPersistence();
    await signInWithCustomToken(stagingAuth, data.token);
  } else {
    await signInWithCustomToken(auth, data.token);
  }
}

export const clearAdminSessionToken = () => {
  window.localStorage.removeItem(authStorageKey(ADMIN_ID_TOKEN_KEY));
  window.localStorage.removeItem(authStorageKey(ADMIN_REFRESH_TOKEN_KEY));
  window.localStorage.removeItem('staging_push_ready');
};

export const getAdminIdToken = async () => {
  if (isNativePlatform()) {
    return refreshNativeAdminIdToken();
  }

  const selectedAuth = isStagingSession() ? stagingAuth : auth;
  // In the phone-preview iframe Firebase may still be restoring its persisted
  // session when the first staging database read runs.
  if (isStagingSession()) await ensureStagingAuthPersistence();
  await selectedAuth.authStateReady();
  const currentUser = selectedAuth.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken();
};

export async function sendScheduleNotification(details: {
  academy: AcademyId;
  date: string;
  cycleName?: string | null;
  changeType: string;
  previewText?: string;
  targetId: string;
  changedFields: string[];
  recipients: NotificationRecipients;
}) {
  if (useFirebaseEmulators) throw new Error('Push notifications are disabled in local emulator mode.');
  if (isStagingSession()) return sendTestScheduleNotification(details);
  if (isNativePlatform()) {
    const idToken = await getAdminIdToken();
    if (!idToken) throw new Error('permission-denied');
    await callNativeFunction('sendScheduleNotification', details, idToken);
    return;
  }

  await httpsCallable(activeFunctions(), 'sendScheduleNotification')(details);
}

export async function getCurrentDevicePushToken() {
  if (useFirebaseEmulators) throw new Error('Push notifications are disabled in local emulator mode.');
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
  academy: AcademyId;
  date: string;
  cycleName?: string | null;
  changeType: string;
  previewText?: string;
  targetId: string;
  changedFields: string[];
}) {
  if (useFirebaseEmulators) throw new Error('Push notifications are disabled in local emulator mode.');
  const token = await getCurrentDevicePushToken();
  if (isNativePlatform()) {
    const idToken = await getAdminIdToken();
    if (!idToken) throw new Error('permission-denied');
    await callNativeFunction('sendTestScheduleNotification', { ...details, token }, idToken);
    return;
  }
  await httpsCallable(activeFunctions(), 'sendTestScheduleNotification')({
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
  if (useFirebaseEmulators) return 'unsupported';
  if (!isPhoneDevice()) return 'unsupported';
  if (window.localStorage.getItem(PUSH_DISABLED_KEY) === 'true') return 'disabled';

  if (isNativePlatform()) {
    const permission = await FirebaseMessaging.checkPermissions();
    if (permission.receive === 'granted') return isStagingSession() && window.localStorage.getItem('staging_push_ready') !== 'true' ? 'prompt' : 'granted';
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

export async function enableNotifications(role: UserRole, cycleName?: string | null, testMode = false, academy: AcademyId = 'BLC', allAcademies = false) {
  if (useFirebaseEmulators) throw new Error('Push notifications are disabled in local emulator mode.');
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

    if (testMode || isStagingSession()) {
      if (!isStagingSession()) throw new Error('Staging session required.');
      const idToken = await getAdminIdToken();
      if (!idToken) throw new Error('permission-denied');
      await callNativeFunction('registerPushToken', { token, academy, allAcademies }, idToken);
      window.localStorage.setItem(PUSH_TOKEN_KEY, token);
      window.localStorage.removeItem(PUSH_TOPIC_KEY);
      window.localStorage.removeItem(PUSH_DISABLED_KEY);
      window.localStorage.setItem('staging_push_ready', 'true');
      return;
    }

    const subscription = await callNativeFunction<{ subscribed?: boolean; topic?: string | null }>(
      'registerPushToken',
      {
        token,
        role: role || 'UNKNOWN',
        cycleName: cycleName || null,
        academy,
        allAcademies,
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

  if (testMode) {
    if (!isStagingSession()) throw new Error('Staging session required.');
    await httpsCallable(activeFunctions(), 'registerPushToken')({ token, academy, allAcademies });
    window.localStorage.setItem(PUSH_TOKEN_KEY, token);
    window.localStorage.removeItem(PUSH_TOPIC_KEY);
    window.localStorage.removeItem(PUSH_DISABLED_KEY);
    return;
  }

  const result = await httpsCallable(activeFunctions(), 'registerPushToken')({
    token,
    role: role || 'UNKNOWN',
    cycleName: cycleName || null,
    academy,
    allAcademies,
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

export async function syncNotificationSubscription(role: UserRole, cycleName?: string | null, academy: AcademyId = 'BLC', allAcademies = false) {
  if (useFirebaseEmulators) return;
  if (isNativePlatform()) {
    const permission = await FirebaseMessaging.checkPermissions();
    if (permission.receive !== 'granted') return;
    await enableNotifications(role, cycleName, isStagingSession(), academy, allAcademies);
    return;
  }

  if (Notification.permission !== 'granted' || !window.localStorage.getItem(PUSH_TOKEN_KEY)) return;
  await enableNotifications(role, cycleName, isStagingSession(), academy, allAcademies);
}

async function disableNotificationsInternal(
  role?: UserRole,
  cycleName?: string | null,
  recoverMissingToken = true,
  deleteNativeToken = true,
  academy: AcademyId = 'BLC',
  allAcademies = false
) {
  if (useFirebaseEmulators) {
    window.localStorage.removeItem(PUSH_TOKEN_KEY);
    window.localStorage.removeItem(PUSH_TOPIC_KEY);
    window.localStorage.setItem(PUSH_DISABLED_KEY, 'true');
    return;
  }
  const staging = isStagingSession();
  window.localStorage.removeItem('staging_push_ready');
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
        if (!staging) await callNativeFunction('unregisterPushToken', { token, topic, role, cycleName, academy, allAcademies });
      } else {
        await httpsCallable(activeFunctions(), 'unregisterPushToken')({ token, topic, role, cycleName, academy, allAcademies });
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
  deleteNativeToken = true,
  academy: AcademyId = 'BLC',
  allAcademies = false
) {
  const operation = disableNotificationsInternal(
    role,
    cycleName,
    recoverMissingToken,
    deleteNativeToken,
    academy,
    allAcademies
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
  if (useFirebaseEmulators) return () => undefined;
  if (!isPhoneDevice()) return () => undefined;

  if (isNativePlatform()) {
    const getNotificationDetail = (data: unknown) => {
      const payload = data && typeof data === 'object'
        ? data as Record<string, unknown>
        : {};
      const value = (key: string) => typeof payload[key] === 'string' ? payload[key] as string : '';
      return {
        academy: payload.academy === 'KTA' ? 'KTA' : payload.academy === 'BLC' ? 'BLC' : undefined,
        date: value('date'),
        targetId: value('targetId'),
        changeType: value('changeType'),
        previewText: value('previewText'),
        changedFields: value('changedFields').split(',').filter(Boolean)
      };
    };
    const dispatchNotification = (data: unknown) => {
      const environment = (data as { environment?: string } | undefined)?.environment;
      if ((environment === 'staging') !== isStagingSession()) return;
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
      academy: payload.data?.academy === 'KTA' ? 'KTA' : payload.data?.academy === 'BLC' ? 'BLC' : undefined,
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
