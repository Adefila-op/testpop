import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Heart,
  MessageCircle,
  ShoppingCart,
  Share2,
  Filter,
  Calendar
} from 'lucide-react';
import { useAccount } from 'wagmi';

interface AnalyticsData {
  items: Array<{
    id: string;
    item_type: string;
    title: string;
    comment_count: number;
    avg_rating: number;
    analytics: {
      views: number;
      likes: number;
      comments: number;
      purchases: number;
      shares: number;
    };
  }>;
  total_stats: {
    total_views: number;
    total_likes: number;
    total_comments: number;
    total_purchases: number;
    total_shares: number;
    avg_rating: number;
  };
}

interface Subscriber {
  id: string;
  subscriber_wallet: string;
  subscription_tier: string;
  subscribed_at: string;
}

interface SubscriberStats {
  total_subscribers: number;
  by_tier: {
    free: number;
    supporter: number;
    vip: number;
    collector: number;
  };
}

export function CreatorDashboard() {
  const { address } = useAccount();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [stats, setStats] = useState<SubscriberStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'items' | 'subscribers'>('overview');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const [analyticsRes, subscribersRes] = await Promise.all([
          fetch('/api/personalization/creator/analytics'),
          fetch('/api/personalization/creator/subscribers')
        ]);

        const analyticsData = await analyticsRes.json();
        const subscribersData = await subscribersRes.json();

        setAnalytics(analyticsData);
        setSubscribers(subscribersData.subscribers);
        setStats(subscribersData.stats);
      } catch (error) {
        console.error('Failed to fetch creator data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [address]);

  if (!address) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Please connect your wallet to view analytics</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Creator Dashboard</h1>
          <p className="text-gray-600 mt-2">Track your content performance and audience</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['overview', 'items', 'subscribers'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'overview' && '📊 Overview'}
              {tab === 'items' && '📦 Your Items'}
              {tab === 'subscribers' && '👥 Subscribers'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard
                icon={<Eye className="w-6 h-6" />}
                label="Total Views"
                value={analytics?.total_stats.total_views || 0}
                color="blue"
              />
              <MetricCard
                icon={<Heart className="w-6 h-6" />}
                label="Total Likes"
                value={analytics?.total_stats.total_likes || 0}
                color="red"
              />
              <MetricCard
                icon={<MessageCircle className="w-6 h-6" />}
                label="Total Comments"
                value={analytics?.total_stats.total_comments || 0}
                color="purple"
              />
              <MetricCard
                icon={<ShoppingCart className="w-6 h-6" />}
                label="Total Sales"
                value={analytics?.total_stats.total_purchases || 0}
                color="green"
              />
              <MetricCard
                icon={<Users className="w-6 h-6" />}
                label="Subscribers"
                value={stats?.total_subscribers || 0}
                color="yellow"
              />
            </div>

            {/* Engagement Overview */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  Engagement Summary
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Avg Rating</span>
                    <span className="font-semibold">
                      {(analytics?.total_stats.avg_rating || 0).toFixed(1)} ⭐
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Engagement Rate</span>
                    <span className="font-semibold">
                      {(
                        ((analytics?.total_stats.total_likes || 0) /
                          Math.max(analytics?.total_stats.total_views || 1, 1)) *
                        100
                      ).toFixed(1)}
                      %
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Share Activity</span>
                    <span className="font-semibold">
                      {analytics?.total_stats.total_shares || 0} shares
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Subscriber Tiers
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Free</span>
                    <span className="font-semibold">{stats?.by_tier.free || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Supporter</span>
                    <span className="font-semibold">{stats?.by_tier.supporter || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">VIP</span>
                    <span className="font-semibold text-purple-600">{stats?.by_tier.vip || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Collector</span>
                    <span className="font-semibold text-gold">{stats?.by_tier.collector || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Items Tab */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Your Items Performance</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-semibold">Title</th>
                    <th className="text-center p-3 font-semibold">Views</th>
                    <th className="text-center p-3 font-semibold">Likes</th>
                    <th className="text-center p-3 font-semibold">Comments</th>
                    <th className="text-center p-3 font-semibold">Sales</th>
                    <th className="text-center p-3 font-semibold">Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium line-clamp-1">{item.title}</p>
                          <p className="text-xs text-gray-500">
                            {item.item_type === 'drop' ? '🎨' : item.item_type === 'product' ? '📦' : '🎬'}{' '}
                            {item.item_type}
                          </p>
                        </div>
                      </td>
                      <td className="text-center p-3">{item.analytics.views}</td>
                      <td className="text-center p-3">{item.analytics.likes}</td>
                      <td className="text-center p-3">{item.analytics.comments}</td>
                      <td className="text-center p-3">{item.analytics.purchases}</td>
                      <td className="text-center p-3">
                        {item.avg_rating ? `${item.avg_rating.toFixed(1)}⭐` : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscribers Tab */}
        {activeTab === 'subscribers' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Your Subscribers ({subscribers.length})
              </h3>
            </div>

            <div className="grid gap-4">
              {subscribers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No subscribers yet. Create amazing content to attract followers!</p>
                </div>
              ) : (
                subscribers.map((subscriber) => (
                  <div
                    key={subscriber.id}
                    className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium">{subscriber.subscriber_wallet.slice(0, 12)}...</p>
                      <p className="text-sm text-gray-500">
                        Subscribed {new Date(subscriber.subscribed_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold capitalize">
                      {subscriber.subscription_tier}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: 'blue' | 'red' | 'purple' | 'green' | 'yellow';
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}

export default CreatorDashboard;
