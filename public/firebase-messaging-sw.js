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

firebase.messaging();

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
    const existing = clientList.find(client => 'focus' in client);
    return existing ? existing.focus() : clients.openWindow('/');
  }));
});
