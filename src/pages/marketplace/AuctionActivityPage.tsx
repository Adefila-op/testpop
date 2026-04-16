/**
 * Auction Activity Page
 * Location: src/pages/marketplace/AuctionActivityPage.tsx
 * 
 * Display all active auctions and user's bidding activity
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import {
  useGetActiveAuctions,
  useGetUserAuctionActivity,
} from '@/hooks/useAuctionStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Gavel, TrendingUp, Clock, Users, AlertCircle } from 'lucide-react';

interface Auction {
  id: string;
  tokenId: string;
  nftName: string;
  image: string;
  creator: string;
  currentBid: number;
  minimumNextBid: number;
  bidCount: number;
  timeRemaining: number;
  endTime: string;
  highBidder: string;
  endsAt: string;
}

interface BidActivity {
  id: string;
  auctionId: string;
  nftName: string;
  bidAmount: number;
  placed: string;
  status: 'high' | 'outbid';
  currentBid: number;
}

export function AuctionActivityPage() {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('ending-soon');

  const { data: allAuctions, isLoading: auctionsLoading } = useGetActiveAuctions();
  const { data: userActivity, isLoading: activityLoading } = useGetUserAuctionActivity(
    address || '0x0'
  );

  const filteredAuctions = (allAuctions || [])
    .filter((auction: Auction) =>
      searchQuery === '' ||
      auction.nftName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      auction.creator.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a: Auction, b: Auction) => {
      switch (sortBy) {
        case 'ending-soon':
          return a.timeRemaining - b.timeRemaining;
        case 'ending-later':
          return b.timeRemaining - a.timeRemaining;
        case 'highest-bid':
          return b.currentBid - a.currentBid;
        case 'most-bids':
          return b.bidCount - a.bidCount;
        default:
          return 0;
      }
    });

  const userBids = (userActivity || []).filter(
    (bid: BidActivity) => bid.status === 'high'
  );
  const outbidBids = (userActivity || []).filter(
    (bid: BidActivity) => bid.status === 'outbid'
  );

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Auction Activity</h1>
        <p className="text-gray-600">
          Explore active auctions and track your bidding activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active Auctions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{allAuctions?.length || 0}</p>
            <p className="text-xs text-gray-600 mt-1">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Your Active Bids</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{userBids.length}</p>
            <p className="text-xs text-gray-600 mt-1">Winning bids</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Outbid</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{outbidBids.length}</p>
            <p className="text-xs text-gray-600 mt-1">Need action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Volume</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {(
                (allAuctions || []).reduce(
                  (sum: number, a: Auction) => sum + a.currentBid,
                  0
                ) || 0
              ).toFixed(2)}{' '}
              ETH
            </p>
            <p className="text-xs text-gray-600 mt-1">In bids</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">All Active Auctions</TabsTrigger>
          <TabsTrigger value="my-activity">
            My Activity {userActivity && userActivity.length > 0 && `(${userActivity.length})`}
          </TabsTrigger>
        </TabsList>

        {/* All Active Auctions Tab */}
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <Input
                  placeholder="Search by NFT name or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 text-sm border rounded-md"
                >
                  <option value="ending-soon">Ending Soon</option>
                  <option value="ending-later">Ending Later</option>
                  <option value="highest-bid">Highest Bid</option>
                  <option value="most-bids">Most Bids</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {auctionsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-64 w-full rounded" />
              ))}
            </div>
          ) : filteredAuctions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAuctions.map((auction: Auction) => {
                const timeLeftMinutes = Math.floor(auction.timeRemaining / 60);
                const timeLeftHours = Math.floor(timeLeftMinutes / 60);
                const timeLeftDays = Math.floor(timeLeftHours / 24);

                let timeDisplay = '';
                if (timeLeftDays > 0) {
                  timeDisplay = `${timeLeftDays}d left`;
                } else if (timeLeftHours > 0) {
                  timeDisplay = `${timeLeftHours}h left`;
                } else {
                  timeDisplay = `${timeLeftMinutes}m left`;
                }

                const isEnding = timeLeftMinutes < 60;

                return (
                  <Card
                    key={auction.id}
                    className={`overflow-hidden hover:shadow-lg transition-shadow ${
                      isEnding ? 'border-orange-300' : ''
                    }`}
                  >
                    <div className="relative h-40 bg-gray-200 overflow-hidden">
                      <img
                        src={auction.image}
                        alt={auction.nftName}
                        className="w-full h-full object-cover hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-2 right-2 space-y-1">
                        <Badge className={isEnding ? 'bg-orange-500' : 'bg-blue-600'}>
                          <Clock className="w-3 h-3 mr-1" />
                          {timeDisplay}
                        </Badge>
                      </div>
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm line-clamp-1 mb-1">
                        {auction.nftName}
                      </h3>
                      <p className="text-xs text-gray-600 mb-3">
                        By {auction.creator.slice(0, 6)}...
                      </p>

                      <div className="space-y-2 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Current Bid:</span>
                          <span className="font-bold">{auction.currentBid} ETH</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Min. Next Bid:</span>
                          <span className="font-semibold text-green-600">
                            {auction.minimumNextBid} ETH
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Bids:</span>
                          <span className="font-semibold">{auction.bidCount}</span>
                        </div>
                      </div>

                      <Button className="w-full bg-blue-600 hover:bg-blue-700" size="sm">
                        <Gavel className="w-3 h-3 mr-2" />
                        Place Bid
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="text-gray-600">No active auctions found</p>
                <p className="text-xs text-gray-500">
                  {searchQuery
                    ? 'Try adjusting your search'
                    : 'Check back soon for new auctions'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Activity Tab */}
        <TabsContent value="my-activity" className="space-y-4">
          {address ? (
            activityLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded" />
                ))}
              </div>
            ) : userActivity && userActivity.length > 0 ? (
              <>
                {/* Winning Bids */}
                {userBids.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h2 className="text-lg font-semibold">Winning ({userBids.length})</h2>
                    </div>

                    <div className="space-y-2 mb-6">
                      {userBids.map((bid: BidActivity) => (
                        <Card key={bid.id}>
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{bid.nftName}</p>
                              <p className="text-sm text-gray-600">
                                Placed {new Date(bid.placed).toLocaleDateString()}
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                {bid.bidAmount} ETH
                              </p>
                              <Badge className="bg-green-100 text-green-800 text-xs mt-1">
                                ✓ Highest Bid
                              </Badge>
                            </div>

                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Outbid */}
                {outbidBids.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <h2 className="text-lg font-semibold">Outbid ({outbidBids.length})</h2>
                    </div>

                    <div className="space-y-2">
                      {outbidBids.map((bid: BidActivity) => (
                        <Card key={bid.id} className="border-orange-200">
                          <CardContent className="p-4 flex justify-between items-center">
                            <div>
                              <p className="font-semibold">{bid.nftName}</p>
                              <p className="text-sm text-gray-600">
                                Current bid: {bid.currentBid} ETH
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-orange-600">
                                {bid.bidAmount} ETH
                              </p>
                              <Badge className="bg-orange-100 text-orange-800 text-xs mt-1">
                                ⚠ Outbid
                              </Badge>
                            </div>

                            <Button className="bg-orange-600 hover:bg-orange-700" size="sm">
                              Bid Higher
                            </Button>
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
                  <Users className="w-8 h-8 text-gray-300 mx-auto" />
                  <p className="text-gray-600">No bidding activity yet</p>
                  <p className="text-xs text-gray-500">
                    Explore auctions and place your first bid
                  </p>
                  <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                    Browse Auctions
                  </Button>
                </CardContent>
              </Card>
            )
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-600">Connect your wallet to view your activity</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AuctionActivityPage;
