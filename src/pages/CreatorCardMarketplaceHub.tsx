import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCreatorCardMarketplace } from '@/hooks/useCreatorCardMarketplace';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  TrendingUp,
  Users,
  Zap,
  ShoppingCart,
  ArrowRight,
  Flame,
} from 'lucide-react';

export function CreatorCardMarketplaceHub() {
  const { stats, statsLoading, transactionHistory, historyLoading } =
    useCreatorCardMarketplace();

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 p-8 md:p-12">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_1px)]"
          style={{
            backgroundSize: '40px 40px'
          }}
        ></div>
        <div className="relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Creator Card Marketplace
          </h1>
          <p className="text-white/90 text-lg max-w-2xl mb-6">
            Discover, collect, and trade creator NFT cards. Support your favorite creators
            and build an exclusive collection.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 font-semibold"
              onClick={() => window.location.href = '/creators'}
            >
              <ShoppingCart className="w-5 h-5 mr-2" />
              Browse Creators
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={() => window.location.href = '/portfolio'}
            >
              My Portfolio
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Listings */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Active Listings</h3>
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          {statsLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="text-3xl font-bold text-white">
                {stats?.totalListings || 0}
              </div>
              <p className="text-xs text-slate-500 mt-2">Creator cards available</p>
            </>
          )}
        </Card>

        {/* Floor Price */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Floor Price</h3>
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-purple-400" />
            </div>
          </div>
          {statsLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="text-3xl font-bold text-white">
                {stats?.floorPrice || '0'} ETH
              </div>
              <p className="text-xs text-slate-500 mt-2">Lowest listed price</p>
            </>
          )}
        </Card>

        {/* Volume */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">24h Volume</h3>
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          {statsLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="text-3xl font-bold text-white">
                {stats?.volume24h || '0'} ETH
              </div>
              <p className="text-xs text-slate-500 mt-2">Trading volume</p>
            </>
          )}
        </Card>

        {/* Sales */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Sales Today</h3>
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Flame className="w-5 h-5 text-pink-400" />
            </div>
          </div>
          {statsLoading ? (
            <LoadingSpinner />
          ) : (
            <>
              <div className="text-3xl font-bold text-white">
                {stats?.sales24h || 0}
              </div>
              <p className="text-xs text-slate-500 mt-2">Transactions</p>
            </>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Sales */}
        <div className="lg:col-span-2">
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Recent Sales</h2>
              <Flame className="w-5 h-5 text-orange-400" />
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : transactionHistory && transactionHistory.length > 0 ? (
              <div className="space-y-3">
                {transactionHistory.slice(0, 10).map((tx, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-purple-500/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <p className="text-sm font-medium text-white truncate">
                          Sold by {tx.seller.slice(0, 6)}...{tx.seller.slice(-4)}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500">
                        to {tx.buyer.slice(0, 6)}...{tx.buyer.slice(-4)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-semibold text-white">
                        {tx.price} ETH
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(tx.timestamp).toLocaleDateString()}
                      </p>
                    </div>

                    <a
                      href={tx.openSeaLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-4 text-slate-400 hover:text-slate-300 transition-colors"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-slate-400">No sales yet today</p>
              </div>
            )}
          </Card>
        </div>

        {/* Collection Stats */}
        <div>
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Collection Stats
            </h3>

            <div className="space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Unique Owners</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.owners?.length || 0}
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Floor Price</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.floorPrice || '0'} ETH
                </p>
              </div>

              <div className="bg-slate-900/50 rounded-lg p-4">
                <p className="text-xs text-slate-400 mb-1">Available</p>
                <p className="text-2xl font-bold text-white">
                  {stats?.totalListings || 0}
                </p>
              </div>

              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 mt-4"
                onClick={() => window.location.href = '/creators'}
              >
                Explore Now
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
            <ShoppingCart className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Instant Purchase</h3>
          <p className="text-slate-400 text-sm">
            Buy creator cards instantly from the marketplace at floor price
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="w-6 h-6 text-purple-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">OpenSea Integration</h3>
          <p className="text-slate-400 text-sm">
            List and sell your cards on OpenSea for secondary market trading
          </p>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-6">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center mb-4">
            <Users className="w-6 h-6 text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Creator Rewards</h3>
          <p className="text-slate-400 text-sm">
            Earn royalties every time your creator card is traded
          </p>
        </Card>
      </div>
    </div>
  );
}
