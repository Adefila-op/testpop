/**
 * Royalties Panel Component
 * Displays secondary market royalties and claim functionality
 */

import { useState } from 'react';
import { useRoyalties } from '@/hooks/useRoyalties';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, AlertCircle, BarChart3 } from 'lucide-react';

interface RoyaltiesPanelProps {
  onClaimSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function RoyaltiesPanel({
  onClaimSuccess,
  onError,
}: RoyaltiesPanelProps) {
  const { stats, pendingRoyalties, isLoadingStats, claimRoyalties, isClaiming } = useRoyalties();
  const { address } = useWallet();
  const [error, setError] = useState<string | null>(null);

  if (isLoadingStats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Failed to load royalty stats
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleClaimRoyalties = async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (!pendingRoyalties || pendingRoyalties.length === 0) {
      setError('No pending royalties to claim');
      return;
    }

    setError(null);

    try {
      const tokenIds = pendingRoyalties.map((r) => r.token_id);
      await claimRoyalties(tokenIds);
      onClaimSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Claim failed');
      setError(error.message);
      onError?.(error);
    }
  };

  const pendingAmount = parseFloat(stats.pendingClaim.amountEth);
  const totalEarned = parseFloat(stats.totalEarned.amountEth);
  const totalClaimed = parseFloat(stats.totalClaimed.amountEth);

  return (
    <div className="grid gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Royalties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingClaim.amountEth} ETH</div>
            <p className="text-xs text-muted-foreground mt-1">From {pendingRoyalties?.length || 0} sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalEarned.amountEth} ETH</div>
            <p className="text-xs text-muted-foreground mt-1">All secondary sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalClaimed.amountEth} ETH</div>
            <p className="text-xs text-muted-foreground mt-1">Already withdrawn</p>
          </CardContent>
        </Card>
      </div>

      {/* Claim Royalties Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Claim Secondary Royalties
          </CardTitle>
          <CardDescription>
            Earn a percentage of secondary market sales on your NFTs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRoyalties && pendingRoyalties.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingRoyalties.map((sale) => (
                <div key={sale.token_id} className="flex items-center justify-between p-2 bg-muted rounded text-sm">
                  <div>
                    <p className="font-medium">Token: {sale.token_id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">{sale.marketplace}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{(parseFloat(sale.royalty_amount) / 1e18).toFixed(4)} ETH</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="text-sm text-destructive flex gap-2 items-start p-3 bg-destructive/10 rounded">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 border-t space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total to Claim:</span>
              <span className="text-lg font-bold">{stats.pendingClaim.amountEth} ETH</span>
            </div>
            <p className="text-xs text-muted-foreground">
              From {pendingRoyalties?.length || 0} secondary sales across{' '}
              {Object.keys(stats.marketplaces).length} marketplaces
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleClaimRoyalties}
            disabled={isClaiming || !address || pendingAmount === 0}
            className="w-full"
            size="lg"
          >
            {isClaiming && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            {pendingAmount === 0 ? 'No Pending Royalties' : 'Claim Royalties'}
          </Button>
        </CardFooter>
      </Card>

      {/* Marketplace Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Marketplace Distribution
          </CardTitle>
          <CardDescription>Sales by marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          {Object.keys(stats.marketplaces).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(stats.marketplaces).map(([marketplace, count]) => (
                <div key={marketplace} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{marketplace}</span>
                    <Badge variant="secondary">{count} sales</Badge>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${((count as number) / Math.max(...Object.values(stats.marketplaces) as number[])) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No secondary sales yet</p>
          )}
        </CardContent>
      </Card>

      {/* Royalty Rate Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Royalties</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            You earn a percentage of every secondary sale of your NFTs on supported marketplaces.
          </p>
          <ul className="list-disc list-inside space-y-1 text-muted-foreground">
            <li>Set your royalty percentage when creating NFTs</li>
            <li>Royalties tracked across all supported marketplaces</li>
            <li>Claim anytime—no settlement delays</li>
            <li>Receive in ETH, USDC, or USDT</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
