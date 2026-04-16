/**
 * Gift Inbox Component
 * Location: src/components/phase3/gift/GiftInbox.tsx
 * 
 * Shows pending gifts received by the user
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { usePendingGifts } from '@/hooks/useGiftStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Gift, ArrowRight, AlertCircle } from 'lucide-react';

interface GiftInboxProps {
  onClaimClick?: (giftId: string) => void;
}

interface PendingGift {
  id: string;
  productName: string;
  productImage?: string;
  senderName: string;
  message?: string;
  createdAt: string;
  expiresAt?: string;
}

export function GiftInbox({ onClaimClick }: GiftInboxProps) {
  const { isConnected } = useAccount();
  const { data: gifts = [], isLoading, error } = usePendingGifts();

  if (!isConnected) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-600" />
            My Gifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold">Connect Wallet to View Gifts</p>
              <p>Sign in with your wallet to see gifts sent to your email</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="text-sm text-red-600">Failed to load gifts</div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-600" />
            My Gifts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!gifts || gifts.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-600" />
            My Gifts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 space-y-3">
            <Gift className="w-12 h-12 text-gray-300 mx-auto" />
            <div>
              <p className="font-semibold text-gray-900">No Gifts Yet</p>
              <p className="text-sm text-gray-600">
                Gifts sent to your email will appear here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-pink-600" />
            My Gifts
          </div>
          <Badge variant="secondary">{gifts.length} Pending</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {gifts.map((gift: PendingGift) => (
            <div
              key={gift.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex gap-4">
                {/* Product Image */}
                {gift.productImage && (
                  <div className="flex-shrink-0 w-20 h-20 rounded-lg bg-gray-100 overflow-hidden">
                    <img
                      src={gift.productImage}
                      alt={gift.productName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Gift Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className="font-semibold text-gray-900">{gift.productName}</p>
                      <p className="text-sm text-gray-600">From: {gift.senderName}</p>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      Unclaimed
                    </Badge>
                  </div>

                  {gift.message && (
                    <p className="text-sm text-gray-600 mt-2 italic">
                      "{gift.message}"
                    </p>
                  )}

                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-600">
                    <span>Received {new Date(gift.createdAt).toLocaleDateString()}</span>
                    {gift.expiresAt && (
                      <span>• Expires {new Date(gift.expiresAt).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                {/* Claim Button */}
                <div className="flex-shrink-0">
                  <Button
                    size="sm"
                    onClick={() => onClaimClick?.(gift.id)}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    <span>Claim</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default GiftInbox;
