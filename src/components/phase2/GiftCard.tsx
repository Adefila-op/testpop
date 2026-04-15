/**
 * Gift Card Component - Display NFT gifts
 * Shows gift details with claim or manage functionality
 */

import { useState } from 'react';
import { useGifts } from '@/hooks/useGifts';
import { useWallet } from '@/hooks/useWallet';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Gift, AlertCircle, Copy, Check } from 'lucide-react';

interface GiftCardProps {
  gift: {
    id: string;
    senderName: string;
    recipientEmail: string;
    status: string;
    createdAt: string;
    message?: string;
    nftMetadata: {
      name: string;
      image: string;
    };
  };
  isSent?: boolean;
  claimLink?: string;
}

export function GiftCard({
  gift,
  isSent = false,
  claimLink,
}: GiftCardProps) {
  const { claimGift } = useGifts();
  const { address } = useWallet();
  const [isClaiming, setIsClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleClaim = async () => {
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    setIsClaiming(true);
    setError(null);

    try {
      await claimGift({
        giftId: gift.id,
        claimToken: claimLink || '',
        recipientWallet: address,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Claim failed');
      setError(error.message);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleCopyLink = () => {
    if (claimLink) {
      navigator.clipboard.writeText(claimLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    claimed: 'bg-green-100 text-green-800',
    expired: 'bg-red-100 text-red-800',
  };

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-square overflow-hidden bg-muted">
        <img
          src={gift.nftMetadata.image}
          alt={gift.nftMetadata.name}
          className="w-full h-full object-cover"
        />
      </div>
      <CardHeader>
        <div>
          <CardTitle className="line-clamp-2">{gift.nftMetadata.name}</CardTitle>
          <CardDescription className="text-xs">
            {isSent ? `Sent to: ${gift.recipientEmail}` : `From: ${gift.senderName}`}
          </CardDescription>
        </div>
        <Badge className={statusColors[gift.status] || 'bg-gray-100 text-gray-800'}>
          {gift.status}
        </Badge>
      </CardHeader>

      <CardContent>
        {gift.message && (
          <p className="text-sm text-muted-foreground italic mb-2">"{gift.message}"</p>
        )}
        <p className="text-xs text-muted-foreground">
          {isSent ? 'Sent on' : 'Received on'} {new Date(gift.createdAt).toLocaleDateString()}
        </p>
      </CardContent>

      {!isSent && gift.status === 'pending' && (
        <CardFooter className="flex gap-2 flex-col">
          <Button
            onClick={handleClaim}
            disabled={isClaiming || !address}
            className="w-full"
            variant="default"
          >
            {isClaiming && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            <Gift className="mr-2 w-4 h-4" />
            Claim Gift
          </Button>
          {error && (
            <div className="text-sm text-destructive flex gap-2 w-full items-start">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </CardFooter>
      )}

      {isSent && claimLink && (
        <CardFooter>
          <Button
            onClick={handleCopyLink}
            size="sm"
            variant="outline"
            className="w-full"
          >
            {copied ? (
              <>
                <Check className="mr-2 w-4 h-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="mr-2 w-4 h-4" />
                Copy Claim Link
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
