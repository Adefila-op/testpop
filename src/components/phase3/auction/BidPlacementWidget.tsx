/**
 * Bid Placement Widget
 * Location: src/components/phase3/auction/BidPlacementWidget.tsx
 * 
 * Component for placing bids in an auction with real-time validation
 */

import React, { useState, useMemo } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Loader2 } from 'lucide-react';
import { usePlaceBid } from '@/hooks/useAuctionStore';
import { useFormatNumber } from '@/hooks/useCustomHooks';
import { formatEther, parseEther } from 'ethers';

interface BidPlacementWidgetProps {
  auctionId: string;
  currentHighestBid: string;
  minBidIncrement: string;
  onBidPlaced?: () => void;
}

export function BidPlacementWidget({
  auctionId,
  currentHighestBid,
  minBidIncrement,
  onBidPlaced,
}: BidPlacementWidgetProps) {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  const [bidAmount, setBidAmount] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const { mutate: placeBid, isLoading, isError, error } = usePlaceBid(auctionId);

  const currentBidEth = useMemo(
    () => parseFloat(currentHighestBid || '0'),
    [currentHighestBid]
  );
  const minIncrementEth = useMemo(
    () => parseFloat(minBidIncrement || '0'),
    [minBidIncrement]
  );
  const minimumBid = useMemo(
    () => currentBidEth + minIncrementEth,
    [currentBidEth, minIncrementEth]
  );

  const bidAmountNum = useMemo(() => parseFloat(bidAmount || '0'), [bidAmount]);
  const insufficientFunds = (balance?.value || 0n) < parseEther(bidAmount || '0');
  const bidTooLow = bidAmountNum > 0 && bidAmountNum < minimumBid;
  const isValid = !insufficientFunds && !bidTooLow && bidAmountNum > 0 && isConnected;

  const handleBidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only valid numbers with up to 8 decimal places
    if (value === '' || /^\d*\.?\d{0,8}$/.test(value)) {
      setBidAmount(value);
    }
  };

  const handleAutoIncrement = () => {
    const suggested = (minimumBid + 0.01).toFixed(8);
    setBidAmount(suggested);
  };

  const handlePlaceBid = async () => {
    if (!isValid || !bidAmount) return;

    placeBid(
      { amount: bidAmount },
      {
        onSuccess: () => {
          setBidAmount('');
          onBidPlaced?.();
        },
      }
    );
  };

  const formatted = {
    current: useFormatNumber(currentHighestBid, 4),
    minimum: useFormatNumber(minimumBid.toString(), 4),
    balance: useFormatNumber(balance?.formatted || '0', 4),
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Place Your Bid
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Bid Info */}
        <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600 font-semibold">CURRENT BID</p>
            <p className="text-lg font-bold">{formatted.current} ETH</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 font-semibold">MIN INCREMENT</p>
            <p className="text-lg font-bold">{useFormatNumber(minBidIncrement, 4)} ETH</p>
          </div>
        </div>

        {/* Bid Input */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold">Enter Bid Amount</label>
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Enter amount in ETH"
              value={bidAmount}
              onChange={handleBidChange}
              className="flex-1 font-mono"
              disabled={!isConnected}
            />
            <Button
              variant="outline"
              onClick={handleAutoIncrement}
              disabled={!isConnected}
            >
              Auto
            </Button>
          </div>
          <p className="text-xs text-gray-600">
            Minimum bid: <span className="font-semibold">{formatted.minimum} ETH</span>
          </p>
        </div>

        {/* Validation Messages */}
        {isConnected && (
          <div className="space-y-2">
            {insufficientFunds && (
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-700">
                  <p className="font-semibold">Insufficient Balance</p>
                  <p>You have {formatted.balance} ETH</p>
                </div>
              </div>
            )}
            {bidTooLow && bidAmountNum > 0 && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-yellow-700">
                  <p className="font-semibold">Bid Too Low</p>
                  <p>Minimum {formatted.minimum} ETH required</p>
                </div>
              </div>
            )}
            {isError && error && (
              <div className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-red-700">
                  <p className="font-semibold">Error</p>
                  <p>{(error as any)?.message || 'Failed to place bid'}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Options */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
        >
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </button>

        {showAdvanced && (
          <div className="space-y-3 p-3 bg-blue-50 rounded">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Bid with Gas Estimate
              </label>
              <p className="text-xs text-gray-600">
                Estimated gas: <span className="font-mono">~0.01 ETH</span>
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Your Wallet
              </label>
              <p className="text-xs font-mono text-gray-600 break-all">{address}</p>
            </div>
          </div>
        )}

        {/* Place Bid Button */}
        <Button
          onClick={handlePlaceBid}
          disabled={!isValid || isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Placing Bid...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4 mr-2" />
              Place Bid
            </>
          )}
        </Button>

        {!isConnected && (
          <p className="text-xs text-center text-gray-600 p-2 bg-gray-50 rounded">
            Connect your wallet to place a bid
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default BidPlacementWidget;
