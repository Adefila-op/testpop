# Creator Interaction Notification System - Conceptual Design

## Overview
Real-time notification system that alerts creators when they receive interactions (subscriptions, product purchases, campaign investments). Multi-channel delivery with user preferences and rich contextual data.

---

## 1. Notification Events

### Primary Trigger Events

#### 1.1 Subscription Events
- **Event**: Creator subscribed to
- **Trigger**: When `subscribe()` transaction succeeds in artist contract
- **Data**: Subscriber wallet, subscription price, expiry date, timestamp
- **Example**: "New subscriber! 0.02 ETH/month from 0x1234...5678"

#### 1.2 Product Purchase Events
- **Event**: Product/drop purchased
- **Trigger**: When `PurchaseCompleted` event emitted from ProductStore contract
- **Data**: Buyer wallet, product name, quantity, total price, order ID
- **Example**: "Product sold! T-Shirt x2 for 0.5 ETH from 0x9abc...def0"

#### 1.3 Campaign Investment Events
- **Event**: Creator's IP campaign funded by investor
- **Trigger**: When investor commits to the campaign (createIPInvestment succeeds)
- **Data**: Investor wallet, campaign title, amount/units invested
- **Example**: "Campaign investment! $10k committed to 'Album 2024' by 0x5670...bcd1"

#### 1.4 Campaign Milestone Events (Future)
- Campaign reaches funding target
- Campaign expires/closes
- Investor withdraws from campaign

---

## 2. Database Schema

### 2.1 Notifications Table

```sql
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  creator_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL,
  
  -- Event Details
  event_type VARCHAR(50) NOT NULL, -- subscription, purchase, investment, etc
  event_id VARCHAR(255), -- tx hash or order ID for uniqueness
  
  -- Notification Metadata
  title VARCHAR(255) NOT NULL,
  description TEXT,
  message TEXT, -- Full rich message
  
  -- Structured Data (for dynamic UI)
  interactor_wallet TEXT,
  interactor_display_name VARCHAR(255),
  product_id UUID,
  product_name VARCHAR(255),
  campaign_id UUID,
  campaign_title VARCHAR(255),
  
  -- Financial Data
  amount_eth DECIMAL(18, 8),
  amount_usd DECIMAL(18, 2),
  currency VARCHAR(10),
  
  -- Quantity & Items
  quantity INT,
  
  -- Status
  read BOOLEAN DEFAULT FALSE,
  actioned BOOLEAN DEFAULT FALSE, -- Creator clicked through
  action_url TEXT, -- URL to relevant detail page
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_creator_id ON notifications(creator_id);
CREATE INDEX IF NOT EXISTS idx_notifications_creator_wallet ON notifications(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_notifications_event_type ON notifications(event_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
```

### 2.2 Notification Preferences Table

```sql
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL UNIQUE REFERENCES artists(id) ON DELETE CASCADE,
  creator_wallet TEXT NOT NULL UNIQUE,
  
  -- Event Subscriptions
  notify_subscriptions BOOLEAN DEFAULT TRUE,
  notify_purchases BOOLEAN DEFAULT TRUE,
  notify_investments BOOLEAN DEFAULT TRUE,
  notify_milestones BOOLEAN DEFAULT TRUE,
  
  -- Delivery Channels
  enable_in_app BOOLEAN DEFAULT TRUE,
  enable_web_push BOOLEAN DEFAULT TRUE,
  enable_email BOOLEAN DEFAULT FALSE,
  email_address TEXT,
  
  -- Notification Frequency
  digest_frequency VARCHAR(50) DEFAULT 'real_time', -- real_time, hourly, daily, none
  quiet_hours_start TIME, -- e.g., 22:00 for prod notifications
  quiet_hours_end TIME, -- e.g., 08:00
  
  -- Notification Grouping
  batch_similar_events BOOLEAN DEFAULT FALSE,
  batch_window_minutes INT DEFAULT 5, -- Group events within 5min
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prefs_creator ON notification_preferences(creator_wallet);
```

### 2.3 Notification Delivery Log Table (for reliability)

```sql
CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery Method
  channel VARCHAR(50) NOT NULL, -- in_app, email, web_push
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed, bounced
  error_message TEXT,
  retry_count INT DEFAULT 0,
  
  -- Details
  recipient_email TEXT,
  push_subscription_endpoint TEXT, -- For web push
  device_id VARCHAR(255), -- For targeting
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_notification_id ON notification_delivery_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status ON notification_delivery_log(status);
```

---

## 3. Event Trigger Architecture

### 3.1 On-Chain Event Listeners (Real-time)

**Implementation**: Use event listeners on smart contracts to capture real-time interactions

```typescript
// Subscribe Event Listener (Artist Contract)
artistContract.on('NewSubscriber', async (subscriber, priceEth, timestamp) => {
  await createNotification({
    creatorId: artistId,
    eventType: 'subscription',
    eventId: `${txHash}-${timestamp}`,
    interactorWallet: subscriber,
    amountEth: priceEth,
    title: 'New Subscriber!',
    message: `${formatAddress(subscriber)} subscribed at ${priceEth} ETH/month`,
    actionUrl: `/artists/${artistId}/subscribers`
  });
});

// Purchase Event Listener (Product Store)
productStore.on('PurchaseCompleted', async (orderId, buyer, productId, quantity, totalPrice) => {
  const product = await getProduct(productId);
  await createNotification({
    creatorId: productCreatorId,
    eventType: 'purchase',
    eventId: orderId,
    interactorWallet: buyer,
    productId,
    productName: product.name,
    quantity,
    amountEth: totalPrice,
    title: `Product Sold: ${product.name}`,
    message: `${quantity}x "${product.name}" sold for ${totalPrice} ETH`,
    actionUrl: `/studio/products/${productId}/orders/${orderId}`
  });
});

// IP Campaign Investment Listener
campaignContract.on('InvestmentCommitted', async (campaignId, investor, amountPublicEth, unitsPublic) => {
  const campaign = await getCampaign(campaignId);
  await createNotification({
    creatorId: campaign.artistId,
    eventType: 'investment',
    eventId: tx.hash,
    interactorWallet: investor,
    campaignId,
    campaignTitle: campaign.title,
    amountEth: amountPublicEth,
    quantity: unitsPublic,
    title: `Campaign Investment: ${campaign.title}`,
    message: `Invested ${amountPublicEth} ETH (${unitsPublic} units) in "${campaign.title}"`,
    actionUrl: `/artists/${campaign.artistId}/campaigns/${campaignId}`
  });
});
```

### 3.2 Backend Service (Node.js/Express)

```typescript
// POST /api/notifications/create
async function createNotification(req: CreateNotificationRequest) {
  const {
    creatorId,
    creatorWallet,
    eventType,
    eventId,
    data // interactorWallet, productName, amountEth, etc
  } = req.body;

  // Create notification record
  const notification = await db.notifications.insert({
    creator_id: creatorId,
    creator_wallet: creatorWallet,
    event_type: eventType,
    event_id: eventId,
    title: data.title,
    message: generateMessage(eventType, data),
    interactor_wallet: data.interactorWallet,
    product_id: data.productId,
    amount_eth: data.amountEth,
    action_url: data.actionUrl,
    metadata: data
  });

  // Get creator's preferences
  const prefs = await db.notificationPreferences.findOne({
    creator_wallet: creatorWallet
  });

  // Route to delivery channels based on preferences
  const deliveryTasks = [];
  
  if (prefs.enable_in_app) {
    deliveryTasks.push(deliverInApp(notification, creatorId));
  }
  
  if (prefs.enable_web_push && hasActivePushSubscription(creatorWallet)) {
    deliveryTasks.push(deliverWebPush(notification, creatorWallet));
  }
  
  if (prefs.enable_email && prefs.email_address) {
    deliveryTasks.push(deliverEmail(notification, prefs.email_address));
  }

  // Execute in parallel with error handling
  const results = await Promise.allSettled(deliveryTasks);
  
  // Log delivery attempts
  for (const [idx, result] of results.entries()) {
    await logDelivery(notification.id, result);
  }

  return notification;
}

// GET /api/notifications - Fetch creator's notifications
async function getNotifications(creatorWallet: string, query) {
  const { limit = 20, offset = 0, unreadOnly = false, eventType } = query;

  let q = db.notifications
    .where('creator_wallet', creatorWallet);

  if (unreadOnly) q = q.where('read', false);
  if (eventType) q = q.where('event_type', eventType);

  return q
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset);
}

// PATCH /api/notifications/:id/read
async function markAsRead(notificationId: string) {
  return db.notifications.update(notificationId, {
    read: true,
    updated_at: new Date()
  });
}

// PATCH /api/notifications/preferences
async function updatePreferences(creatorWallet: string, prefs) {
  return db.notificationPreferences.update(
    { creator_wallet: creatorWallet },
    prefs
  );
}
```

---

## 4. Notification Delivery Channels

### 4.1 In-App Notifications (Real-time Badge + Notification Center)

**UI Components**:
- **Notification Badge**: Shows unread count in studio header
- **Notification Center Modal**: Scrollable list with filters
- **Toast Notification**: Optional toast for immediate visuals

**Implementation**: 
- Store in-app notifications in component state
- Use WebSocket for real-time updates (optional optimization)
- Persist read status to db.notification_preferences.read

```typescript
// NotificationCenter Component
export const NotificationCenter = ({ creatorWallet }: Props) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Initial load
    fetchNotifications(creatorWallet);
    
    // Real-time updates (polling or WebSocket)
    const interval = setInterval(() => {
      fetchNotifications(creatorWallet);
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [creatorWallet]);

  return (
    <Dialog>
      <Badge>{unreadCount}</Badge>
      
      <DialogContent>
        <DialogTitle>Notifications</DialogTitle>
        
        <Tabs defaultValue="all">
          <TabList>
            <Tab value="all">All</Tab>
            <Tab value="subscriptions">Subscriptions</Tab>
            <Tab value="purchases">Purchases</Tab>
            <Tab value="investments">Investments</Tab>
          </TabList>

          <NotificationList
            notifications={notifications}
            onRead={markAsRead}
            onAction={handleNotificationAction}
          />
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
```

### 4.2 Web Push Notifications

**Requirements**:
- Browser must support Service Workers & Push API
- Creator must grant permission
- Push subscription endpoint stored in db

**Implementation**:

```typescript
// Register for push notifications
async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push notifications not supported');
    return;
  }

  const registration = await navigator.serviceWorker.register('/sw.js');
  
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
  });

  // Send subscription to backend
  await fetch('/api/notifications/push-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription,
      creatorWallet
    })
  });
}

// Send push notification from backend
async function deliverWebPush(notification: Notification, creatorWallet: string) {
  const subscription = await db.pushSubscriptions.findOne({
    creator_wallet: creatorWallet
  });

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.message,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    data: {
      notificationId: notification.id,
      actionUrl: notification.action_url
    },
    tag: `notification-${notification.id}`,
    requireInteraction: true // Stays visible until clicked
  });

  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    if (error.statusCode === 410) {
      // Subscription expired
      await db.pushSubscriptions.delete(subscription.id);
    }
    throw error;
  }
}
```

### 4.3 Email Notifications

**Implementation**: Using SendGrid or similar service

```typescript
async function deliverEmail(notification: Notification, email: string) {
  const emailContent = renderNotificationEmail(notification);

  await sendEmail({
    to: email,
    subject: `${notification.title} - POPUP Creator Notification`,
    html: emailContent,
    from: 'notifications@popup.com'
  });
}

// Email template
function renderNotificationEmail(notification: Notification) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>${notification.title}</h2>
        <p>${notification.message}</p>
        
        ${notification.amount_eth ? `
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Amount:</strong> ${notification.amount_eth} ETH</p>
          </div>
        ` : ''}
        
        <a href="${notification.action_url}" style="
          display: inline-block;
          padding: 12px 24px;
          background: #000;
          color: #fff;
          text-decoration: none;
          border-radius: 6px;
          margin: 20px 0;
        ">View Details</a>
      </div>
    </div>
  `;
}
```

---

## 5. Notification Preferences UI (Artist Studio)

**Location**: Settings/Profile tab in Artist Studio

```typescript
export const NotificationPreferences = ({ creatorWallet }: Props) => {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Events</h3>
        
        <CheckboxField
          label="New Subscriptions"
          checked={prefs?.notify_subscriptions}
          onChange={() => updatePrefs({ notify_subscriptions: !prefs?.notify_subscriptions })}
          description="Get notified when someone subscribes to you"
        />
        
        <CheckboxField
          label="Product Sales"
          checked={prefs?.notify_purchases}
          onChange={() => updatePrefs({ notify_purchases: !prefs?.notify_purchases })}
          description="Get notified when your products are purchased"
        />
        
        <CheckboxField
          label="Campaign Investments"
          checked={prefs?.notify_investments}
          onChange={() => updatePrefs({ notify_investments: !prefs?.notify_investments })}
          description="Get notified when investors commit to your campaigns"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Delivery Channels</h3>
        
        <CheckboxField
          label="In-App Notifications"
          checked={prefs?.enable_in_app}
          onChange={() => updatePrefs({ enable_in_app: !prefs?.enable_in_app })}
          description="See notifications in your studio"
        />
        
        <CheckboxField
          label="Web Push Notifications"
          checked={prefs?.enable_web_push}
          onChange={() => updatePrefs({ enable_web_push: !prefs?.enable_web_push })}
          description="Browser notifications (requires permission)"
        />
        
        <CheckboxField
          label="Email Notifications"
          checked={prefs?.enable_email}
          onChange={() => updatePrefs({ enable_email: !prefs?.enable_email })}
          description="Notifications sent to your email"
        />
        
        {prefs?.enable_email && (
          <InputField
            label="Email Address"
            type="email"
            value={prefs.email_address}
            onChange={(email) => updatePrefs({ email_address: email })}
          />
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Notification Frequency</h3>
        
        <SelectField
          label="Delivery Frequency"
          value={prefs?.digest_frequency}
          options={[
            { value: 'real_time', label: 'Real-time' },
            { value: 'hourly', label: 'Hourly Digest' },
            { value: 'daily', label: 'Daily Digest' },
            { value: 'none', label: 'Disable All' }
          ]}
          onChange={(freq) => updatePrefs({ digest_frequency: freq })}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Quiet Hours</h3>
        <p className="text-sm text-muted-foreground">
          Pause non-urgent notifications during these hours
        </p>
        
        <TimeRangeField
          label="Quiet Hours"
          startTime={prefs?.quiet_hours_start}
          endTime={prefs?.quiet_hours_end}
          onChange={(start, end) => updatePrefs({
            quiet_hours_start: start,
            quiet_hours_end: end
          })}
        />
      </div>
    </div>
  );
};
```

---

## 6. Implementation Timeline

### Phase 1: Foundation (Week 1)
- [ ] Create database tables (notifications, preferences, delivery_log)
- [ ] Implement notification creation API endpoint
- [ ] Add notification fetching/marking read endpoints
- [ ] Build notification preferences endpoint

### Phase 2: In-App Notifications (Week 2)
- [ ] Build NotificationCenter component
- [ ] Add notification badge to studio header
- [ ] Implement WebSocket for real-time updates (optional)
- [ ] Add notification filtering/search
- [ ] Create settings UI for preferences

### Phase 3: On-Chain Event Listeners (Week 2-3)
- [ ] Add subscription event listener to artist contract
- [ ] Add purchase event listener to product store
- [ ] Add investment event listener to campaign contract
- [ ] Implement dedupe logic (eventId field)
- [ ] Add error handling & retry logic

### Phase 4: Web Push Notifications (Week 3)
- [ ] Create service worker for push handling
- [ ] Implement push subscription enrollment
- [ ] Add web push delivery function
- [ ] Test across browsers (Chrome, Firefox, Safari)

### Phase 5: Email Notifications (Week 4)
- [ ] Set up SendGrid/Mailgun integration
- [ ] Create email templates
- [ ] Implement email delivery with retry
- [ ] Add unsubscribe links

### Phase 6: Advanced Features (Future)
- [ ] Digest notifications (hourly/daily batching)
- [ ] Quiet hours enforcement
- [ ] Rich notification formatting
- [ ] Analytics on notification engagement

---

## 7. Event Message Templates

### Subscription Notification
```
Title: New Subscriber! 🎉
Message: {name or 0x1234...5678} subscribed for {price} ETH/month
Action URL: /studio/subscribers
Metadata: {subscriber_wallet, price_eth, expires_at}
```

### Purchase Notification
```
Title: Product Sold! 🛍️
Message: {quantity}x {product_name} sold for {total_price} ETH
Action URL: /studio/products/{product_id}/orders/{order_id}
Metadata: {buyer_wallet, product_id, order_id, quantity, total_price}
```

### Investment Notification
```
Title: Campaign Investment! 💰
Message: {investor_name or 0x...} invested {amount} ETH in "{campaign_title}"
Action URL: /studio/campaigns/{campaign_id}
Metadata: {investor_wallet, campaign_id, amount_eth, units}
```

---

## 8. Data Privacy & Security

- Only send notifications to authenticated creator wallets
- Use RLS policies to prevent unauthorized access to notifications
- Don't expose sensitive wallet addresses to frontend (use shortened format)
- Validate all event sources before creating notifications
- Implement rate limiting on notification endpoints
- Store email addresses encrypted at rest

---

## 9. Success Metrics

- **Adoption**: % of creators with notifications enabled
- **Engagement**: % of creators clicking through notifications
- **Timeliness**: Avg time from event to notification delivery (target: <5s)
- **Reliability**: Delivery success rate (target: >99%)
- **User Satisfaction**: Creator feedback on notification value

---

## 10. Future Enhancements

- **Smart Grouping**: Combine similar events (5 subscriptions → "5 new subscribers")
- **Trending Insights**: "Your subscribers are trending up 50% this week!"
- **Predictive**: "Looks like your early collectors always buy day 2 drops"
- **Notification Channels**: Discord, Telegram, Slack integrations
- **Rich Cards**: Display creator thumbnail + collectible preview
- **Action Buttons**: "View Subscriber", "Send Message" directly from notification
