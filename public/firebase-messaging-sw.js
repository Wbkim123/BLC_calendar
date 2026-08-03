/* global firebase */
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyDNjoIVSKyIRjFm7LQD-yH7pemRZ7c_nyc',
  authDomain: 'blc-calendar-e302f.firebaseapp.com',
  databaseURL: 'https://blc-calendar-e302f-default-rtdb.firebaseio.com',
  projectId: 'blc-calendar-e302f',
  storageBucket: 'blc-calendar-e302f.firebasestorage.app',
  messagingSenderId: '245720895881',
  appId: '1:245720895881:web:f55f09f0ca7c2510f15158'
});

const messaging = firebase.messaging();

const getNotificationUrl = notification => {
  const data = notification?.data || {};
  const fcmMessage = data.FCM_MSG || {};
  const fcmData = fcmMessage.data || {};
  const directUrl = data.url || data.link || fcmMessage.fcmOptions?.link || fcmMessage.fcm_options?.link;
  if (directUrl) return directUrl;

  const date = data.date || fcmData.date;
  const targetId = data.targetId || fcmData.targetId || data.highlight || fcmData.highlight;
  const changeType = data.changeType || fcmData.changeType;
  const previewText = data.previewText || fcmData.previewText;
  const changedFields = data.changedFields || fcmData.changedFields;
  const params = new URLSearchParams();
  if (date) params.set('date', date);
  if (targetId) params.set('highlight', targetId);
  if (changeType) params.set('change', changeType);
  if (previewText) params.set('preview', previewText);
  if (changedFields) params.set('fields', changedFields);
  return params.size > 0 ? `/?${params.toString()}` : '/';
};

// The server message already contains a Web Push notification payload, which
// browsers display automatically in the background. Showing it again here
// produced two identical notifications for every update.

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(getNotificationUrl(event.notification), self.location.origin).href;

  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    const existing = clientList.find(client => 'focus' in client);
    if (existing) {
      if ('navigate' in existing) {
        return existing.navigate(targetUrl).then(client => client ? client.focus() : existing.focus());
      }
      existing.postMessage({
        type: 'BLC_NOTIFICATION_CLICK',
        url: targetUrl
      });
      return existing.focus();
    }
    return clients.openWindow(targetUrl);
  }));
});
