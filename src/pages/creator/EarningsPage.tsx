/**
 * Creator Earnings Page
 * Location: src/pages/creator/EarningsPage.tsx
 * 
 * Shows creator's earnings history, pending payouts, and revenue analytics
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { useGetCreatorEarnings, usePayoutHistory } from '@/hooks/usePayoutStore';
import { useGetCreatorStats } from '@/hooks/usePayoutStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, DollarSign, Calendar, ArrowRight, Users } from 'lucide-react';
import { formatEther } from 'ethers';

export function EarningsPage() {
  const { address } = useAccount();
  const { data: earnings, isLoading: earningsLoading } = useGetCreatorEarnings();
  const { data: payoutHistory, isLoading: historyLoading } = usePayoutHistory(10);
  const { data: stats, isLoading: statsLoading } = useGetCreatorStats();

  if (!address) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to view earnings</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Earnings</h1>
        <p className="text-gray-600">Track your sales and payouts</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Earned */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              Total Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earningsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <p className="text-2xl font-bold">
                  {parseFloat(earnings?.earnings?.totalEarned || '0').toFixed(4)} ETH
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  ${(parseFloat(earnings?.earnings?.totalEarned || '0') * 2500).toFixed(0)}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Payout */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Pending Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            {earningsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div>
                <p className="text-2xl font-bold">
                  {parseFloat(earnings?.earnings?.pending || '0').toFixed(4)} ETH
                </p>
                <Button size="sm" className="mt-2 w-full bg-blue-600 hover:bg-blue-700">
                  Claim
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Products Count */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{stats?.stats?.productsCount || 0}</p>
            )}
          </CardContent>
        </Card>

        {/* Total Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              Total Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold">{stats?.stats?.totalSales || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payout History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Recent Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : payoutHistory && payoutHistory.length > 0 ? (
            <div className="space-y-2 divide-y">
              {payoutHistory.map((payout: any) => (
                <div key={payout.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{payout.amount} ETH</p>
                    <p className="text-xs text-gray-600">
                      {new Date(payout.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {payout.payout_method}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600 py-8">No payouts yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default EarningsPage;
