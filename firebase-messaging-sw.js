/**
 * AttendX — Firebase Messaging Service Worker
 * Required by FCM to deliver push notifications when the app is closed.
 * This file MUST be at the ROOT of your domain: /firebase-messaging-sw.js
 *
 * KЭL ♛ PHANTOM — VALIDE EdTech
 */

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Firebase config (must match index.html) ──────────────────────────────────
firebase.initializeApp({
  apiKey:            "AIzaSyDT2evTvU6_exbLTY8kIiO9n-mrF7vg4hs",
  authDomain:        "attendex-47d45.firebaseapp.com",
  projectId:         "attendex-47d45",
  storageBucket:     "attendex-47d45.firebasestorage.app",
  messagingSenderId: "731988308422",
  appId:             "1:731988308422:web:ebc33605ab8ad24025c2c7"
});

const messaging = firebase.messaging();

// ── Background push handler ───────────────────────────────────────────────────
// This fires when the app is CLOSED or in the BACKGROUND
messaging.onBackgroundMessage((payload) => {
  console.log('[AttendX SW] Background push received:', payload);

  const data        = payload.data || {};
  const notification = payload.notification || {};

  const title = notification.title || data.title || 'AttendX';
  const body  = notification.body  || data.body  || 'You have a new notification.';
  const type  = data.type || 'general';
  const url   = data.url  || '/';

  // Map type to vibration pattern
  const vibrateMap = {
    emergency:   [500, 200, 500, 200, 500],
    attendance:  [300, 100, 300],
    session:     [200, 100, 200],
    announcement:[100, 50,  100],
    message:     [200, 100, 200],
    general:     [200]
  };

  // Map type to icon emoji
  const iconMap = {
    emergency: '🚨', attendance: '✅', session: '📚',
    announcement: '📢', message: '💬', general: '🔔'
  };

  const options = {
    body,
    icon:   '/icons/icon-192.png',
    badge:  '/icons/badge-72.png',
    tag:    `attendx-${type}-${Date.now()}`,
    vibrate: vibrateMap[type] || [200],
    requireInteraction: type === 'emergency' || type === 'attendance',
    data:   { url, type },
    actions: _getActions(type)
  };

  self.registration.showNotification(title, options);
});

// ── Notification click handler ────────────────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).origin === self.location.origin) {
          client.focus();
          client.postMessage({ type: 'PUSH_CLICKED', url });
          return;
        }
      }
      return clients.openWindow(url);
    })
  );
});

function _getActions(type) {
  const map = {
    emergency:   [{ action: 'view', title: '🚨 View Alert' }],
    attendance:  [{ action: 'view', title: '✅ Mark Attendance' }],
    session:     [{ action: 'view', title: '📚 Open Session' }],
    announcement:[{ action: 'view', title: '📢 Read Now' }],
    message:     [{ action: 'view', title: '💬 Open Message' }],
    general:     [{ action: 'view', title: '🔔 Open App' }]
  };
  return map[type] || map.general;
}
