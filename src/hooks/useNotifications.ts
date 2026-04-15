/**
 * useNotifications Hook
 * Location: src/hooks/useNotifications.ts
 */

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from './useWallet';

export interface Notification {
  id: string;
  creator_wallet: string;
  event_type: 'subscription' | 'purchase' | 'investment' | 'milestone';
  title: string;
  message: string;
  interactor_wallet?: string;
  product_name?: string;
  amount_eth?: number;
  quantity?: number;
  action_url?: string;
  read: boolean;
  created_at: string;
}

export interface NotificationPreferences {
  notify_subscriptions: boolean;
  notify_purchases: boolean;
  notify_investments: boolean;
  notify_milestones: boolean;
  enable_in_app: boolean;
  enable_web_push: boolean;
  enable_email: boolean;
  email_address?: string;
  digest_frequency: 'real_time' | 'hourly' | 'daily' | 'weekly' | 'none';
}

export function useNotifications() {
  const { address } = useWallet();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    if (!address) return;

    try {
      setLoading(true);
      const response = await fetch(
        `/api/notifications?unreadOnly=${unreadOnly}&limit=50`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [address]);

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/notifications/preferences', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch preferences');

      const data = await response.json();
      setPreferences(data.preferences || null);
    } catch (err) {
      console.error('Error fetching preferences:', err);
    }
  }, [address]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) throw new Error('Failed to mark notification as read');

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!address) return;

      try {
        const response = await fetch('/api/notifications/preferences', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(updates)
        });

        if (!response.ok) throw new Error('Failed to update preferences');

        const data = await response.json();
        setPreferences(data.preferences);
      } catch (err) {
        console.error('Error updating preferences:', err);
        throw err;
      }
    },
    [address]
  );

  // Initial load and polling
  useEffect(() => {
    if (!address) return;

    fetchNotifications();
    fetchPreferences();

    // Poll for new notifications every 10 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 10000);

    return () => clearInterval(interval);
  }, [address, fetchNotifications, fetchPreferences]);

  return {
    notifications,
    unreadCount,
    preferences,
    loading,
    error,
    fetchNotifications,
    fetchPreferences,
    markAsRead,
    updatePreferences
  };
}
