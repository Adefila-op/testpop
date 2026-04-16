/**
 * Gift History Page
 * Location: src/pages/marketplace/GiftHistoryPage.tsx
 * 
 * View sent and received gift history
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  useGetSentGifts,
  usePendingGifts,
} from '@/hooks/useGiftStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Gift, Send, Check, Clock, AlertCircle, Copy } from 'lucide-react';

interface SentGift {
  id: string;
  recipientEmail: string;
  recipientAddress?: string;
  nftName: string;
  nftImage: string;
  message: string;
  sentAt: string;
  claimedAt?: string;
  status: 'pending' | 'claimed' | 'expired';
  claimUrl: string;
}

interface ReceivedGift {
  id: string;
  senderName: string;
  nftName: string;
  nftImage: string;
  message: string;
  receivedAt: string;
  claimedAt?: string;
  status: 'pending' | 'claimed';
}

export function GiftHistoryPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('received');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: sentGifts, isLoading: sentLoading } = useGetSentGifts(address || '0x0');
  const { data: receivedGifts, isLoading: receivedLoading } = usePendingGifts(
    address || '0x0'
  );

  const pendingSent = (sentGifts || []).filter((g: SentGift) => g.status === 'pending');
  const claimedSent = (sentGifts || []).filter((g: SentGift) => g.status === 'claimed');
  const expiredSent = (sentGifts || []).filter((g: SentGift) => g.status === 'expired');

  const pendingReceived = (receivedGifts || []).filter(
    (g: ReceivedGift) => g.status === 'pending'
  );

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!address) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to view gifts</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gift History</h1>
        <p className="text-gray-600">Send and receive NFTs as gifts</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gifts Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{sentGifts?.length || 0}</p>
            <p className="text-xs text-gray-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Gifts Received</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(receivedGifts || []).length}</p>
            <p className="text-xs text-gray-600 mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Pending Received</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{pendingReceived.length}</p>
            <p className="text-xs text-gray-600 mt-1">Need action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Claimed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {claimedSent.length + (receivedGifts?.filter((g: ReceivedGift) => g.status === 'claimed').length || 0)}
            </p>
            <p className="text-xs text-gray-600 mt-1">Total claimed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received">
            Received {pendingReceived.length > 0 && `(${pendingReceived.length})`}
          </TabsTrigger>
          <TabsTrigger value="sent">Sent {pendingSent.length > 0 && `(${pendingSent.length})`}</TabsTrigger>
        </TabsList>

        {/* Received Gifts Tab */}
        <TabsContent value="received" className="space-y-4">
          {receivedLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded" />
              ))}
            </div>
          ) : pendingReceived.length > 0 ? (
            <>
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  <h2 className="text-lg font-semibold">Pending ({pendingReceived.length})</h2>
                </div>

                <div className="space-y-3">
                  {pendingReceived.map((gift: ReceivedGift) => (
                    <Card key={gift.id} className="border-orange-200">
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-center">
                          <img
                            src={gift.nftImage}
                            alt={gift.nftName}
                            className="w-20 h-20 rounded object-cover"
                          />

                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{gift.nftName}</h3>
                            <p className="text-sm text-gray-600 mb-1">
                              From: <span className="font-semibold">{gift.senderName}</span>
                            </p>
                            {gift.message && (
                              <p className="text-sm italic text-gray-600 mb-2">
                                "{gift.message}"
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {new Date(gift.receivedAt).toLocaleDateString()}
                            </p>
                          </div>

                          <div>
                            <Badge className="bg-orange-100 text-orange-800 mb-3">
                              ⏳ Pending
                            </Badge>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                  <Check className="w-3 h-3 mr-2" />
                                  Claim Gift
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Claim Gift</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <img
                                    src={gift.nftImage}
                                    alt={gift.nftName}
                                    className="w-full rounded-lg"
                                  />
                                  <div className="space-y-2">
                                    <p className="font-semibold">{gift.nftName}</p>
                                    {gift.message && (
                                      <p className="text-sm italic text-gray-600">
                                        "{gift.message}"
                                      </p>
                                    )}
                                    <p className="text-sm text-gray-600">
                                      From: {gift.senderName}
                                    </p>
                                  </div>
                                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                                    Confirm & Add to Wallet
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          ) : null}

          {/* Claimed Received */}
          {(receivedGifts || []).filter((g: ReceivedGift) => g.status === 'claimed').length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" />
                Claimed
              </h2>

              <div className="space-y-3">
                {(receivedGifts || [])
                  .filter((g: ReceivedGift) => g.status === 'claimed')
                  .map((gift: ReceivedGift) => (
                    <Card key={gift.id}>
                      <CardContent className="p-4">
                        <div className="flex gap-4 items-center">
                          <img
                            src={gift.nftImage}
                            alt={gift.nftName}
                            className="w-20 h-20 rounded object-cover opacity-70"
                          />

                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{gift.nftName}</h3>
                            <p className="text-sm text-gray-600">
                              From: {gift.senderName}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                              Claimed{' '}
                              {gift.claimedAt &&
                                new Date(gift.claimedAt).toLocaleDateString()}
                            </p>
                          </div>

                          <Badge className="bg-green-100 text-green-800">
                            ✓ Claimed
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {(receivedGifts || []).length === 0 && (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Gift className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-gray-600">No gifts received yet</p>
                <p className="text-xs text-gray-500">
                  When someone sends you an NFT gift, it will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sent Gifts Tab */}
        <TabsContent value="sent" className="space-y-4">
          {sentLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded" />
              ))}
            </div>
          ) : sentGifts && sentGifts.length > 0 ? (
            <>
              {/* Pending Sent */}
              {pendingSent.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-orange-600" />
                    <h2 className="text-lg font-semibold">Pending ({pendingSent.length})</h2>
                  </div>

                  <div className="space-y-3 mb-6">
                    {pendingSent.map((gift: SentGift) => (
                      <Card key={gift.id} className="border-orange-200">
                        <CardContent className="p-4">
                          <div className="flex gap-4 items-center">
                            <img
                              src={gift.nftImage}
                              alt={gift.nftName}
                              className="w-20 h-20 rounded object-cover"
                            />

                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">{gift.nftName}</h3>
                              <p className="text-sm text-gray-600">
                                To: {gift.recipientEmail}
                              </p>
                              {gift.message && (
                                <p className="text-sm italic text-gray-600 line-clamp-1 mt-1">
                                  "{gift.message}"
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                Sent{' '}
                                {new Date(gift.sentAt).toLocaleDateString()}
                              </p>
                            </div>

                            <div>
                              <Badge className="bg-orange-100 text-orange-800 mb-3">
                                ⏳ Pending
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyUrl(gift.claimUrl, gift.id)}
                                className="w-full"
                              >
                                {copiedId === gift.id ? (
                                  <>✓ Copied</>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3 mr-1" />
                                    Copy Link
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Claimed Sent */}
              {claimedSent.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    Claimed ({claimedSent.length})
                  </h2>

                  <div className="space-y-3 mb-6">
                    {claimedSent.map((gift: SentGift) => (
                      <Card key={gift.id}>
                        <CardContent className="p-4">
                          <div className="flex gap-4 items-center">
                            <img
                              src={gift.nftImage}
                              alt={gift.nftName}
                              className="w-20 h-20 rounded object-cover opacity-70"
                            />

                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">{gift.nftName}</h3>
                              <p className="text-sm text-gray-600">
                                {gift.recipientAddress
                                  ? `Claimed by ${gift.recipientAddress.slice(0, 6)}...`
                                  : 'Claimed'}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {gift.claimedAt &&
                                  new Date(gift.claimedAt).toLocaleDateString()}
                              </p>
                            </div>

                            <Badge className="bg-green-100 text-green-800">
                              ✓ Claimed
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Expired */}
              {expiredSent.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    Expired ({expiredSent.length})
                  </h2>

                  <div className="space-y-3">
                    {expiredSent.map((gift: SentGift) => (
                      <Card key={gift.id} className="border-red-200">
                        <CardContent className="p-4">
                          <div className="flex gap-4 items-center">
                            <img
                              src={gift.nftImage}
                              alt={gift.nftName}
                              className="w-20 h-20 rounded object-cover opacity-50 grayscale"
                            />

                            <div className="flex-1">
                              <h3 className="font-semibold mb-1">{gift.nftName}</h3>
                              <p className="text-sm text-gray-600">
                                {gift.recipientEmail}
                              </p>
                              <p className="text-xs text-red-600 mt-2">
                                Expired on{' '}
                                {new Date(gift.sentAt).toLocaleDateString()}
                              </p>
                            </div>

                            <Badge className="bg-red-100 text-red-800">
                              ✕ Expired
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <Send className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-gray-600">No gifts sent yet</p>
                <p className="text-xs text-gray-500">
                  Send NFTs as gifts to your friends and community
                </p>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                  Send Gift
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default GiftHistoryPage;
