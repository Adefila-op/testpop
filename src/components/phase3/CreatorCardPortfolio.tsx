import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  TrendingUp,
  ShoppingCart,
  Tag,
  ArrowUpRight,
  Copy,
  ExternalLink,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { useCreatorCardMarketplace } from '@/hooks/useCreatorCardMarketplace';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useToast } from '@/hooks/use-toast';

interface CardTemplate {
  id: string;
  tokenId: string;
  creatorAddress: string;
  image: string;
  name: string;
  bio: string;
  verified: boolean;
  acquired?: Date;
  price?: string;
}

export function CreatorCardPortfolio() {
  const {
    userCards,
    cardsLoading,
    userListings,
    listingsLoading,
    listCreatorCard,
    cancelListing,
  } = useCreatorCardMarketplace();

  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CardTemplate | null>(null);
  const [listPrice, setListPrice] = useState('');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleListCard = async () => {
    if (!selectedCard || !listPrice) return;

    setIsLoading(true);
    try {
      const result = await listCreatorCard(selectedCard.tokenId, listPrice);

      if (result.success) {
        toast({
          title: 'Listed successfully!',
          description: `${selectedCard.name} listed for ${listPrice} ETH`,
        });
        setListDialogOpen(false);
        setSelectedCard(null);
        setListPrice('');
      } else {
        toast({
          title: 'Listing failed',
          description: result.error || 'Failed to list card',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelListing = async (listingId: string) => {
    setIsLoading(true);
    try {
      const result = await cancelListing(listingId);

      if (result.success) {
        toast({
          title: 'Listing cancelled',
          description: 'Your listing has been removed',
        });
        setCancelDialogOpen(false);
      } else {
        toast({
          title: 'Failed to cancel',
          description: result.error || 'Failed to cancel listing',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: text,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Your Creator Cards</h2>
        <p className="text-slate-400">View and manage your creator NFT card collection</p>
      </div>

      <Tabs defaultValue="holdings" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 bg-slate-800 border-slate-700">
          <TabsTrigger value="holdings" className="data-[state=active]:bg-slate-700">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Holdings ({userCards?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="listings" className="data-[state=active]:bg-slate-700">
            <Tag className="w-4 h-4 mr-2" />
            Listings ({userListings?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Holdings Tab */}
        <TabsContent value="holdings" className="space-y-4 mt-6">
          {cardsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : userCards && userCards.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {userCards.map((card: CardTemplate) => (
                <Card
                  key={card.id}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden hover:border-purple-500/50 transition-all"
                >
                  {/* Card Image */}
                  <div className="relative h-48 bg-gradient-to-br from-purple-500/20 to-pink-500/20 overflow-hidden">
                    <img
                      src={card.image}
                      alt={card.name}
                      className="w-full h-full object-cover"
                    />
                    {card.verified && (
                      <Badge className="absolute top-2 right-2 bg-blue-500/90">
                        Verified
                      </Badge>
                    )}
                  </div>

                  {/* Card Info */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h4 className="font-semibold text-white">{card.name}</h4>
                      <p className="text-sm text-slate-400 line-clamp-1">{card.bio}</p>
                    </div>

                    {/* Acquired Date */}
                    {card.acquired && (
                      <div className="text-xs text-slate-500">
                        Acquired: {new Date(card.acquired).toLocaleDateString()}
                      </div>
                    )}

                    {/* Current Price Badge */}
                    {card.price && (
                      <div className="bg-purple-500/10 rounded p-2 flex items-center justify-between">
                        <span className="text-xs text-slate-300">Floor Price</span>
                        <span className="font-semibold text-purple-400">{card.price} ETH</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Dialog open={listDialogOpen && selectedCard?.id === card.id}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400"
                            onClick={() => {
                              setSelectedCard(card);
                              setListDialogOpen(true);
                            }}
                          >
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                            List
                          </Button>
                        </DialogTrigger>

                        <DialogContent className="bg-slate-900 border-slate-700">
                          <DialogHeader>
                            <DialogTitle>List Creator Card</DialogTitle>
                            <DialogDescription>
                              Set a price to list {selectedCard?.name} on the marketplace
                            </DialogDescription>
                          </DialogHeader>

                          <div className="space-y-4">
                            {/* Preview */}
                            <div className="bg-slate-800/50 rounded-lg p-3">
                              <img
                                src={selectedCard?.image}
                                alt={selectedCard?.name}
                                className="w-full h-32 object-cover rounded mb-2"
                              />
                              <h4 className="font-semibold text-white text-sm">
                                {selectedCard?.name}
                              </h4>
                            </div>

                            {/* Price Input */}
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-slate-300">
                                Price (ETH)
                              </label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="Enter price in ETH"
                                value={listPrice}
                                onChange={(e) => setListPrice(e.target.value)}
                                className="bg-slate-800 border-slate-600"
                              />
                              <p className="text-xs text-slate-400">
                                Current floor price: {selectedCard?.price || '0.5'} ETH
                              </p>
                            </div>

                            {/* List Button */}
                            <Button
                              onClick={handleListCard}
                              disabled={isLoading || !listPrice}
                              className="w-full bg-emerald-500 hover:bg-emerald-600"
                            >
                              {isLoading ? 'Listing...' : `List for ${listPrice} ETH`}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1"
                        onClick={() => copyToClipboard(card.creatorAddress)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700 p-8 text-center">
              <ShoppingCart className="w-12 h-12 mx-auto text-slate-500 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No creator cards yet</h3>
              <p className="text-slate-400 text-sm mb-4">
                Start collecting creator NFT cards from the discovery page
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/creators'}
              >
                Explore Creators
              </Button>
            </Card>
          )}
        </TabsContent>

        {/* Listings Tab */}
        <TabsContent value="listings" className="space-y-4 mt-6">
          {listingsLoading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : userListings && userListings.length > 0 ? (
            <div className="space-y-4">
              {userListings.map((listing: any) => (
                <Card
                  key={listing.id}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-white mb-2">
                        Creator Card Listed
                      </h4>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-slate-400">Price</p>
                          <p className="font-semibold text-white">{listing.price} ETH</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Listed</p>
                          <p className="font-semibold text-white">
                            {new Date(listing.listedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Token ID</p>
                          <p className="font-mono text-xs text-slate-300">
                            {listing.tokenId.slice(0, 8)}...
                          </p>
                        </div>
                      </div>

                      {/* Info Box */}
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded p-2 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-300">
                          This card is listed on the POPUP marketplace and can be purchased by collectors
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const link = `https://opensea.io/assets/ethereum/${listing.creatorAddress}/${listing.tokenId}`;
                          window.open(link, '_blank');
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        OpenSea
                      </Button>

                      <AlertDialog open={cancelDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedCard(listing);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </DialogTrigger>

                        <AlertDialogContent className="bg-slate-900 border-slate-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Listing?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove your creator card from the marketplace. You can relist it anytime.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="flex gap-2">
                            <AlertDialogCancel className="bg-slate-700 hover:bg-slate-600 border-slate-600">
                              Keep Listed
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleCancelListing(listing.id)}
                              className="bg-red-600 hover:bg-red-700"
                              disabled={isLoading}
                            >
                              {isLoading ? 'Cancelling...' : 'Cancel Listing'}
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="bg-slate-800/50 border-slate-700 p-8 text-center">
              <Tag className="w-12 h-12 mx-auto text-slate-500 mb-4 opacity-50" />
              <h3 className="text-lg font-medium text-slate-300 mb-2">No active listings</h3>
              <p className="text-slate-400 text-sm mb-4">
                You haven't listed any creator cards yet. List your holdings above to start selling.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
