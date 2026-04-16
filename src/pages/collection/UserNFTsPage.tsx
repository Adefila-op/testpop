/**
 * User NFTs Page
 * Location: src/pages/collection/UserNFTsPage.tsx
 * 
 * Display user's owned NFT collection
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useGetUserNFTs, useListNFTForAuction } from '@/hooks/useAuctionStore';
import { useCreateAuction } from '@/hooks/useAuctionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Gift, Gavel, Settings2, AlertCircle, Grid, List } from 'lucide-react';

interface NFT {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  creator: string;
  acquiredAt: string;
  currentValue?: number;
  isListedForSale?: boolean;
}

export function UserNFTsPage() {
  const { address } = useAccount();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCreator, setFilterCreator] = useState('all');

  const { data: nfts, isLoading } = useGetUserNFTs(address || '0x0');
  const { mutate: createAuction, isLoading: auctioning } = useCreateAuction();

  if (!address) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to view your NFTs</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredNFTs = (nfts || []).filter((nft: NFT) => {
    const nameMatch =
      searchQuery === '' ||
      nft.name.toLowerCase().includes(searchQuery.toLowerCase());
    const creatorMatch =
      filterCreator === 'all' || nft.creator === filterCreator;
    return nameMatch && creatorMatch;
  });

  const uniqueCreators = Array.from(
    new Set((nfts || []).map((nft: NFT) => nft.creator))
  );

  const handleStartAuction = (nft: NFT) => {
    createAuction(
      {
        tokenId: nft.tokenId,
        reservePrice: nft.currentValue || '0.1',
        endTime: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
      },
      {
        onSuccess: () => {
          // Success notification
        },
      }
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">My NFT Collection</h1>
        <p className="text-gray-600">
          {nfts?.length || 0} item{(nfts?.length !== 1 ? 's' : '')} in your collection
        </p>
      </div>

      {/* Summary Stats */}
      {nfts && nfts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Items</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{nfts.length}</p>
              <p className="text-xs text-gray-600 mt-1">In your collection</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {(
                  nfts.reduce(
                    (sum: number, nft: NFT) => sum + (nft.currentValue || 0),
                    0
                  ) || 0
                ).toFixed(2)}{' '}
                ETH
              </p>
              <p className="text-xs text-gray-600 mt-1">Combined value</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Listed for Auction</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {nfts.filter((nft: NFT) => nft.isListedForSale).length}
              </p>
              <p className="text-xs text-gray-600 mt-1">Currently selling</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and View Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <Input
              placeholder="Search NFTs by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {uniqueCreators.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Filter by creator:</span>
                    <select
                      value={filterCreator}
                      onChange={(e) => setFilterCreator(e.target.value)}
                      className="px-3 py-1.5 text-sm border rounded-md"
                    >
                      <option value="all">All Creators</option>
                      {uniqueCreators.map((creator: any) => (
                        <option key={creator} value={creator}>
                          {creator.slice(0, 6)}...{creator.slice(-4)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="flex items-center gap-1"
                >
                  <Grid className="w-4 h-4" />
                  Grid
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="flex items-center gap-1"
                >
                  <List className="w-4 h-4" />
                  List
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* NFT Display */}
      {isLoading ? (
        <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4' : 'space-y-2'} gap-4`}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className={`${viewMode === 'grid' ? 'h-48' : 'h-16'} w-full rounded`} />
          ))}
        </div>
      ) : filteredNFTs.length > 0 ? (
        <>
          {viewMode === 'grid' ? (
            // Grid View
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredNFTs.map((nft: NFT) => (
                <Card key={nft.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-40 bg-gray-200 overflow-hidden">
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                    />
                    {nft.isListedForSale && (
                      <Badge className="absolute top-2 right-2 bg-orange-500">
                        <Gavel className="w-3 h-3 mr-1" />
                        Auctioning
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                      {nft.name}
                    </h3>
                    <p className="text-xs text-gray-600 mb-3">
                      {nft.description.slice(0, 50)}...
                    </p>
                    {nft.currentValue && (
                      <p className="text-sm font-bold text-gray-900 mb-3">
                        {nft.currentValue} ETH
                      </p>
                    )}
                    <div className="space-y-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            disabled={auctioning || nft.isListedForSale}
                          >
                            <Gavel className="w-3 h-3 mr-2" />
                            {nft.isListedForSale ? 'Listed' : 'Auction'}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogTitle>Start Auction</AlertDialogTitle>
                          <AlertDialogDescription>
                            List "{nft.name}" for auction. Auctions run for 7 days.
                          </AlertDialogDescription>
                          <div className="space-y-4 py-4">
                            <div>
                              <label className="text-sm font-semibold">
                                Reserve Price (ETH)
                              </label>
                              <Input
                                type="number"
                                defaultValue={nft.currentValue || '0.1'}
                                step="0.01"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleStartAuction(nft)}
                            >
                              Start Auction
                            </AlertDialogAction>
                          </div>
                        </AlertDialogContent>
                      </AlertDialog>

                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Gift className="w-3 h-3 mr-2" />
                        Gift
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // List View
            <div className="space-y-2 divide-y">
              {filteredNFTs.map((nft: NFT) => (
                <div key={nft.id} className="py-4 flex justify-between items-center">
                  <div className="flex items-start gap-4 flex-1">
                    <img
                      src={nft.image}
                      alt={nft.name}
                      className="w-16 h-16 rounded object-cover"
                    />
                    <div>
                      <h3 className="font-semibold">{nft.name}</h3>
                      <p className="text-sm text-gray-600">
                        {nft.description.slice(0, 100)}...
                      </p>
                      <div className="flex gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {nft.creator.slice(0, 6)}...
                        </Badge>
                        {nft.isListedForSale && (
                          <Badge className="bg-orange-500 text-xs">
                            <Gavel className="w-3 h-3 mr-1" />
                            Auctioning
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right mr-4">
                    {nft.currentValue && (
                      <p className="font-bold">{nft.currentValue} ETH</p>
                    )}
                    <p className="text-xs text-gray-600">
                      {new Date(nft.acquiredAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          disabled={nft.isListedForSale}
                        >
                          Auction
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogTitle>Start Auction</AlertDialogTitle>
                        <AlertDialogDescription>
                          List "{nft.name}" for auction.
                        </AlertDialogDescription>
                        <div className="flex gap-2">
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleStartAuction(nft)}>
                            Start
                          </AlertDialogAction>
                        </div>
                      </AlertDialogContent>
                    </AlertDialog>

                    <Button size="sm" variant="outline">
                      Gift
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="text-gray-600">
              {searchQuery || filterCreator !== 'all'
                ? 'No NFTs match your filters'
                : 'No NFTs in your collection yet'}
            </p>
            <Button variant="outline" className="mt-4">
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UserNFTsPage;
