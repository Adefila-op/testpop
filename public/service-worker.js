/**
 * Service Worker for Web Push Notifications
 * Location: public/service-worker.js
 * 
 * This file handles push notifications on:
 * - Desktop browsers (Chrome, Firefox, Edge, Safari)
 * - Mobile browsers (capable browsers)
 * - Lock screen notifications (Android)
 */

// Listen for push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received');

  let notificationData = {
    title: 'POPUP Notification',
    options: {
      body: 'You have a new notification',
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      tag: 'notification'
    }
  };

  // Parse push event data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        options: {
          body: data.body || notificationData.options.body,
          icon: data.icon || notificationData.options.icon,
          badge: data.badge || notificationData.options.badge,
          tag: data.tag || notificationData.options.tag,
          requireInteraction: data.requireInteraction !== false,
          data: data.data || {}
        }
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(
      notificationData.title,
      notificationData.options
    )
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('👆 Notification clicked');

  event.notification.close();

  const actionUrl = event.notification.data?.actionUrl || '/studio';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if window is already open
        for (let client of clientList) {
          if (client.url === actionUrl && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise, open new window
        if (clients.openWindow) {
          return clients.openWindow(actionUrl);
        }
      })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('❌ Notification closed');
  // Could track dismissals here
});

// Standard service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('⚡ Service Worker activated');
  event.waitUntil(clients.claim());
});
