/**
 * Web Push Configuration
 * Location: src/lib/webPush.ts
 */

/**
 * Initialize push notifications
 * Call this once when app loads
 */
export async function initializePushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('⚠️  Push notifications not supported in this browser');
    return null;
  }

  try {
    // Register service worker
    const registration = await navigator.serviceWorker.register('/service-worker.js', {
      scope: '/'
    });
    console.log('✅ Service worker registered');

    return registration;
  } catch (error) {
    console.error('❌ Error registering service worker:', error);
    return null;
  }
}

/**
 * Request push notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    console.warn('⚠️  Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(token: string) {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('⚠️  Push notifications not supported');
      return null;
    }

    // Request permission first
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      console.warn('⚠️  Notification permission denied');
      return null;
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
      ) as BufferSource
    });

    console.log('✅ Push subscription created');

    // Send subscription to backend
    const response = await fetch('/api/notifications/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      throw new Error('Failed to register push subscription');
    }

    console.log('✅ Push subscription registered with backend');
    return subscription;
  } catch (error) {
    console.error('❌ Error subscribing to push notifications:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Unsubscribed from push notifications');
      return true;
    }
  } catch (error) {
    console.error('❌ Error unsubscribing from push notifications:', error);
  }
  return false;
}

/**
 * Check if already subscribed to push notifications
 */
export async function isPushSubscribed() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (error) {
    console.error('❌ Error checking push subscription:', error);
    return false;
  }
}

/**
 * Get push notification permission status
 */
export function getPushPermissionStatus(): NotificationPermission {
  if ('Notification' in window) {
    return Notification.permission;
  }
  return 'denied';
}

/**
 * Auto-subscribe to push notifications (called on app install)
 * Attempts to request permission and subscribe automatically
 */
export async function autoSubscribeToPushNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return null;
    }

    const permission = await requestNotificationPermission();
    if (!permission) {
      console.log('⏭️  User denied notification permission');
      return null;
    }

    // Wait for service worker to be ready
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    
    if (existing) {
      console.log('✅ Already subscribed to push notifications');
      return existing;
    }

    // Get auth token if user is logged in
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.log('⏭️  No auth token available yet - will subscribe after login');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(
        process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
      ) as BufferSource
    });

    console.log('✅ Auto-subscribed to push notifications');

    // Register with backend
    const response = await fetch('/api/notifications/push-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON()
      })
    });

    if (!response.ok) {
      console.warn('⚠️  Failed to register subscription with backend');
      return subscription;
    }

    console.log('✅ Push subscription registered with backend');
    return subscription;
  } catch (error) {
    console.warn('⏭️  Auto-subscription failed (non-critical):', error);
    return null;
  }
}

/**
 * Convert VAPID key from base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
