/**
 * Royalty Dashboard Page
 * Location: src/pages/creator/RoyaltyDashboardPage.tsx
 * 
 * Track and claim secondary market royalties
 */

import React from 'react';
import { useAccount } from 'wagmi';
import {
  useGetRoyaltyBalance,
  useClaimRoyalties,
  useGetRoyaltyHistory,
} from '@/hooks/usePayoutStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, TrendingUp, Clock, AlertCircle } from 'lucide-react';

export function RoyaltyDashboardPage() {
  const { address } = useAccount();
  const { data: balance, isLoading: balanceLoading } = useGetRoyaltyBalance();
  const { data: history, isLoading: historyLoading } = useGetRoyaltyHistory(10);
  const { mutate: claimRoyalties, isLoading: claiming } = useClaimRoyalties();

  if (!address) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to view royalties</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const pendingAmount = balance?.balance?.pendingAmount
    ? parseFloat(balance.balance.pendingAmount)
    : 0;

  const handleClaim = () => {
    claimRoyalties('0x0000000000000000000000000000000000000000', {
      onSuccess: () => {
        // Success toast
      },
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Secondary Market Royalties</h1>
        <p className="text-gray-600">Earn from every resale of your NFTs</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pending Royalties */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Pending Royalties
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <p className="text-2xl font-bold">{pendingAmount.toFixed(4)} ETH</p>
                <p className="text-xs text-gray-600 mt-1">
                  ${(pendingAmount * 2500).toFixed(0)}
                </p>
                <Button
                  onClick={handleClaim}
                  disabled={claiming || pendingAmount === 0}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700"
                  size="sm"
                >
                  {claiming ? 'Claiming...' : 'Claim Royalties'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-purple-600" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div>
                <p className="text-2xl font-bold">
                  {balance?.balance?.pendingCount || 0}
                </p>
                <p className="text-xs text-gray-600 mt-1">Pending royalties</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Royalty Rate */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              Standard Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">10%</p>
            <p className="text-xs text-gray-600 mt-1">Per secondary sale</p>
          </CardContent>
        </Card>
      </div>

      {/* How Secondary Royalties Work */}
      <Card>
        <CardHeader>
          <CardTitle>How Secondary Market Royalties Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900 mb-2">1</div>
              <p className="font-semibold text-sm mb-2">Original Sale</p>
              <p className="text-xs text-blue-800">
                A collector buys your NFT in the primary marketplace
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-900 mb-2">2</div>
              <p className="font-semibold text-sm mb-2">Resale</p>
              <p className="text-xs text-purple-800">
                The collector sells it to someone else on secondary markets (OpenSea, Blur)
              </p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-900 mb-2">3</div>
              <p className="font-semibold text-sm mb-2">You Earn</p>
              <p className="text-xs text-green-800">
                You automatically earn 10% of the resale price
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Royalty Claims */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Royalty History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : history && history.length > 0 ? (
            <div className="space-y-2 divide-y">
              {history.map((claim: any) => (
                <div key={claim.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{claim.amount} ETH claimed</p>
                    <p className="text-xs text-gray-600">
                      {new Date(claim.claimed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {claim.sale_count || 1} sale{claim.sale_count > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-gray-600">No royalty claims yet</p>
              <p className="text-xs text-gray-500">
                Royalties from secondary sales will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Marketplaces */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Supported Marketplaces</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {['OpenSea', 'Blur', 'X2Y2', 'LooksRare'].map((market) => (
              <Badge key={market} variant="secondary">
                {market}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default RoyaltyDashboardPage;
