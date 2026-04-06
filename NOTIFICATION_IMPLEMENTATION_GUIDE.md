# Creator Interaction Notifications - Implementation Guide

## Overview

This guide covers integrating real-time creator notifications into the POPUP platform for:
- ✅ Artist subscriptions
- ✅ Product purchases  
- ✅ Mobile in-app + lock screen notifications
- ✅ Desktop web push popups

---

## Backend Setup (Node.js/Express)

### 1. Add Notification Routes to Main Server (server/index.js)

```javascript
// At the top of server/index.js, after other imports
const notificationRoutes = require('./api/notifications');
const { initializeEventListeners } = require('./services/eventListeners');

// In the Express app setup, after other routes
app.use('/api/notifications', notificationRoutes);

// Initialize event listeners at startup (after database is ready)
if (process.env.NODE_ENV === 'production') {
  initializeEventListeners();
}

// Listen for graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

### 2. Environment Variables (.env.local)

```env
# Web Push Notifications (VAPID Keys)
# Generate with: node -e "const webpush = require('web-push'); console.log(webpush.generateVAPIDKeys());"
VAPID_PUBLIC_KEY=<your_public_key>
VAPID_PRIVATE_KEY=<your_private_key>

# On-Chain Event Listening
BASE_RPC_URL=https://mainnet.base.org
PRODUCT_STORE_ADDRESS=0x...
ARTIST_CONTRACT_ABI=[...]  # From config.js

# Supabase (already configured)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### 3. Install Required Package

```bash
npm install web-push
```

### 4. Generate VAPID Keys

```bash
node -e "const webpush = require('web-push'); console.log(webpush.generateVAPIDKeys());"
```

Copy the output to your `.env.local`:

```env
VAPID_PUBLIC_KEY=BEu...
VAPID_PRIVATE_KEY=xyz...
```

---

## Frontend Setup (React/TypeScript)

### 1. Update Environment Variables

**Create/Update .env** (frontend):

```env
REACT_APP_VAPID_PUBLIC_KEY=<your_public_key_from_above>
```

### 2. Integrate Notification Center into Artist Studio Header

**In ArtistStudioPage.tsx** (around line 2300 in the header):

```typescript
import { NotificationCenter, NotificationBadge } from '@/components/notifications/NotificationCenter';

// In your component state
const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

// In the header section, add this before the logout button:
<NotificationBadge onClick={() => setNotificationCenterOpen(true)} />

// Add this before the closing div of the component
<NotificationCenter
  open={notificationCenterOpen}
  onOpenChange={setNotificationCenterOpen}
/>
```

### 3. Initialize Push Notifications on App Load

**In App.tsx or main layout component:**

```typescript
import { useEffect } from 'react';
import { initializePushNotifications, subscribeToPushNotifications } from '@/lib/webPush';
import { useWallet } from '@/hooks/useContracts';

export function App() {
  const { address, isConnected } = useWallet();

  useEffect(() => {
    // Initialize service worker for push notifications
    initializePushNotifications();
  }, []);

  // Subscribe to push when wallet connected
  useEffect(() => {
    if (isConnected && address) {
      subscribeToPushNotifications(localStorage.getItem('authToken') || '');
    }
  }, [isConnected, address]);

  // ... rest of App component
}
```

### 4. Add Notification Preferences to Settings

**In your Settings/Profile component (optional for now):**

```typescript
import { useNotifications } from '@/hooks/useNotifications';

export const NotificationSettings = () => {
  const { preferences, updatePreferences } = useNotifications();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label>Notify on subscriptions</label>
        <input
          type="checkbox"
          checked={preferences?.notify_subscriptions || true}
          onChange={(e) =>
            updatePreferences({ notify_subscriptions: e.target.checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <label>Notify on purchases</label>
        <input
          type="checkbox"
          checked={preferences?.notify_purchases || true}
          onChange={(e) =>
            updatePreferences({ notify_purchases: e.target.checked })
          }
        />
      </div>

      <div className="flex items-center justify-between">
        <label>Enable web push notifications</label>
        <input
          type="checkbox"
          checked={preferences?.enable_web_push || true}
          onChange={(e) =>
            updatePreferences({ enable_web_push: e.target.checked })
          }
        />
      </div>
    </div>
  );
};
```

---

## Database Setup

### 1. Run Supabase Migration

Run this migration in your Supabase SQL editor:

**File**: `supabase/migrations/20260406_creator_notifications.sql`

This creates:
- `notifications` table
- `notification_preferences` table
- `push_subscriptions` table
- `notification_delivery_log` table
- RLS policies
- Helper functions

---

## Testing Notification System

### 1. Test In-App Notifications

1. Open Artist Studio
2. Look for notification badge in header
3. When you subscribe to an artist or buy a product, you should see a notification

### 2. Test Web Push on Desktop

1. Grant browser permission when prompted
2. Open DevTools Console
3. Should see: `✅ Service worker registered`
4. Trigger a subscription or purchase
5. Should see desktop popup notification

### 3. Test Mobile Lock Screen Notifications

1. Open app on mobile device
2. Grant notification permission
3. Keep app in background or locked
4. Trigger a subscription or purchase
5. Should see locked screen notification (Android/iOS)

---

## File Structure

```
server/
├── api/
│   └── notifications.js           # API endpoints
├── services/
│   ├── notifications.js           # Notification service (create, deliver, manage)
│   └── eventListeners.js          # Smart contract event listeners
└── index.js                        # Main server (add routes here)

src/
├── components/
│   └── notifications/
│       └── NotificationCenter.tsx  # UI components
├── hooks/
│   └── useNotifications.ts         # React hook
├── lib/
│   └── webPush.ts                  # Web push utilities
└── pages/
    └── ArtistStudioPage.tsx        # Add badge + center here

public/
└── service-worker.js              # Service worker for push

supabase/
└── migrations/
    └── 20260406_creator_notifications.sql
```

---

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/notifications` | Create notification (server-side) |
| GET | `/api/notifications` | Fetch creator's notifications |
| GET | `/api/notifications/unread-count` | Get unread count |
| PATCH | `/api/notifications/:id/read` | Mark as read |
| GET | `/api/notifications/preferences` | Get preferences |
| PATCH | `/api/notifications/preferences` | Update preferences |
| POST | `/api/notifications/push-subscription` | Register push subscription |

---

## How It Works

### When Artist Gets Subscribed To:

1. Smart contract emits `NewSubscriber` event
2. Event listener detects event
3. Creates notification in database
4. Delivers via:
   - ✅ In-app notification center
   - ✅ Web push popup on desktop
   - ✅ Lock screen on mobile
5. Creator sees notification immediately

### When Product Is Purchased:

1. ProductStore emits `PurchaseCompleted` event
2. Event listener detects event and gets product details
3. Creates notification with product info
4. Same multi-channel delivery as above

---

## Performance Considerations

- **Polling**: Frontend polls for notifications every 10 seconds (configurable)
- **Event Listeners**: Run continuously in Node.js background
- **Database**: Indexed on `creator_wallet` and `created_at` for fast queries
- **Real-time**: Web push delivers instantly via browser

### To Optimize Further:

- Add WebSocket for real-time frontend updates
- Implement notification batching (group similar events)
- Add caching with Redis for unread counts
- Use event streams instead of polling

---

## Troubleshooting

### Service Worker Not Registering
- Check browser console for errors
- Verify `/service-worker.js` exists in public folder
- Browser must have HTTPS (localhost OK for dev)

### Push Notifications Not Delivering
- Check VAPID keys are set correctly
- Verify permission was granted: `Notification.permission === 'granted'`
- Check browser DevTools → Application → Service Workers
- Verify server is running and listening on correct port

### Event Listeners Not Triggering
- Check event listener logs in server console
- Verify contract addresses in `.env.local`
- Test with Etherscan to confirm events are firing on-chain
- Check RPC URL is correct and responsive

### Notifications Not Appearing in DB
- Verify Supabase connection is working
- Check RLS policies aren't blocking inserts
- Verify creator_wallet matches JWT claim
- Check event_id isn't duplicated (preventing insert)

---

## Next Steps & Future Enhancements

1. **Real-time Updates**: Add WebSocket for instant updates (vs polling)
2. **Email Notifications**: Integrate SendGrid for email delivery
3. **Notification Digest**: Batch notifications into hourly/daily digests
4. **Quiet Hours**: Don't send notifications during specified hours
5. **Rich Actions**: Add buttons in notifications (View, Reply, etc)
6. **Analytics**: Track notification opens, clicks, engagement
7. **Discord/Telegram**: Add alternative delivery channels
8. **Advanced Filters**: Creator can filter what types of transactions notify them

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Check browser DevTools Console for errors
4. Verify all environment variables are set
5. Run Supabase migration if tables don't exist
