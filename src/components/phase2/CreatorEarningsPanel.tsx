/**
 * Creator Earnings Panel Component
 * Displays creator earnings, payouts, and collaborators
 */

import { useState } from 'react';
import { useCreator } from '@/hooks/useCreator';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wallet, AlertCircle, TrendingUp } from 'lucide-react';

interface CreatorEarningsPanelProps {
  onClaimSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function CreatorEarningsPanel({
  onClaimSuccess,
  onError,
}: CreatorEarningsPanelProps) {
  const { earnings, settings, isLoadingEarnings, claimPayouts, isClaiming } = useCreator();
  const { address } = useWallet();
  const [payoutMethod, setPayoutMethod] = useState<'ETH' | 'USDC' | 'USDT'>('ETH');
  const [error, setError] = useState<string | null>(null);

  if (isLoadingEarnings) {
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

  if (!earnings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="w-4 h-4" />
            Failed to load earnings
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleClaim = async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    const pendingAmount = parseFloat(earnings.pending.amountEth);
    if (pendingAmount === 0) {
      setError('No pending payouts to claim');
      return;
    }

    setError(null);

    try {
      await claimPayouts(payoutMethod);
      onClaimSuccess?.();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Claim failed');
      setError(error.message);
      onError?.(error);
    }
  };

  const pendingAmount = parseFloat(earnings.pending.amountEth);
  const totalEarned = parseFloat(earnings.totalEarned.amountEth);

  return (
    <div className="grid gap-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{earnings.pending.amountEth} ETH</div>
            <p className="text-xs text-muted-foreground mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{earnings.totalEarned.amountEth} ETH</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Last Payout</CardTitle>
          </CardHeader>
          <CardContent>
            {earnings.lastPayout ? (
              <>
                <div className="text-3xl font-bold">{earnings.lastPayout.amount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(earnings.lastPayout.date).toLocaleDateString()}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground text-sm">No payouts yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Claim Payout Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5" />
            Claim Payout
          </CardTitle>
          <CardDescription>
            Withdraw your pending earnings to your selected wallet
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            <Select value={payoutMethod} onValueChange={(value: any) => setPayoutMethod(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ETH">Ethereum (ETH)</SelectItem>
                <SelectItem value="USDC">USD Coin (USDC)</SelectItem>
                <SelectItem value="USDT">Tether (USDT)</SelectItem>
              </SelectContent>
            </Select>
            {settings?.payoutAddress && (
              <p className="text-xs text-muted-foreground mt-1">
                Payout address: {settings.payoutAddress.slice(0, 10)}...
              </p>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive flex gap-2 items-start p-3 bg-destructive/10 rounded">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium">Amount to claim:</span>
              <span className="text-lg font-bold">{earnings.pending.amountEth} ETH</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleClaim}
            disabled={isClaiming || !address || pendingAmount === 0}
            className="w-full"
            size="lg"
          >
            {isClaiming && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            {pendingAmount === 0 ? 'No Pending Payouts' : 'Claim Payout'}
          </Button>
        </CardFooter>
      </Card>

      {/* Payout Settings Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout Settings</CardTitle>
          <CardDescription>Configure how you receive payouts</CardDescription>
        </CardHeader>
        <CardContent>
          {settings?.method && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Current Method:</span>
                <Badge>{settings.method}</Badge>
              </div>
              {settings.payoutAddress && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address:</span>
                  <span className="text-sm font-mono">{settings.payoutAddress.slice(0, 10)}...</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Bank Verified:</span>
                <Badge variant={settings.bankingVerified ? 'default' : 'secondary'}>
                  {settings.bankingVerified ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Earnings Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Earnings Rate:</span>
              <span className="font-medium">Real-time</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Payment Frequency:</span>
              <span className="font-medium">On-demand</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Settlement Time:</span>
              <span className="font-medium">24 hours</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
