/**
 * Purchase History Page
 * Location: src/pages/collection/PurchaseHistoryPage.tsx
 * 
 * View user's NFT purchase history and transaction details
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useGetPurchaseHistory } from '@/hooks/useProductStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ShoppingBag, Eye, Download, Filter, AlertCircle, TrendingUp } from 'lucide-react';

interface Purchase {
  id: string;
  transactionHash: string;
  nftName: string;
  creatorName: string;
  image: string;
  pricePaid: number;
  currentValue?: number;
  purchaseDate: string;
  status: 'completed' | 'pending' | 'failed';
  currency: 'ETH' | 'USDC' | 'USDT';
}

export function PurchaseHistoryPage() {
  const { address } = useAccount();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('recent');
  const [filterCurrency, setFilterCurrency] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: history, isLoading } = useGetPurchaseHistory(page, 20);

  if (!address) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to view purchase history</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredPurchases = (history?.purchases || []).filter((purchase: Purchase) => {
    const queryMatch =
      searchQuery === '' ||
      purchase.nftName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      purchase.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
    const currencyMatch =
      filterCurrency === 'all' || purchase.currency === filterCurrency;
    return queryMatch && currencyMatch;
  });

  const sortedPurchases = [...filteredPurchases].sort((a: Purchase, b: Purchase) => {
    switch (sortBy) {
      case 'recent':
        return new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime();
      case 'oldest':
        return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
      case 'expensive':
        return b.pricePaid - a.pricePaid;
      case 'cheapest':
        return a.pricePaid - b.pricePaid;
      case 'gain':
        return (
          ((b.currentValue || 0) - b.pricePaid) - ((a.currentValue || 0) - a.pricePaid)
        );
      default:
        return 0;
    }
  });

  const totalSpent = filteredPurchases.reduce(
    (sum: number, p: Purchase) => sum + p.pricePaid,
    0
  );

  const totalValue = filteredPurchases.reduce(
    (sum: number, p: Purchase) => sum + (p.currentValue || p.pricePaid),
    0
  );

  const totalGain = totalValue - totalSpent;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Purchase History</h1>
        <p className="text-gray-600">Track all your NFT purchases and current portfolio value</p>
      </div>

      {/* Portfolio Summary */}
      {history && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Spent</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalSpent.toFixed(4)} ETH</p>
              <p className="text-xs text-gray-600 mt-1">
                ${(totalSpent * 2500).toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Current Value</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalValue.toFixed(4)} ETH</p>
              <p className="text-xs text-gray-600 mt-1">
                ${(totalValue * 2500).toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Gain/Loss</CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalGain >= 0 ? '+' : ''}{totalGain.toFixed(4)} ETH
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {totalGain >= 0 ? '+' : ''}
                {((totalGain / totalSpent) * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Purchases</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {history.totalPurchases}
              </p>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by NFT name or creator..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Most Recent</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="expensive">Most Expensive</SelectItem>
                <SelectItem value="cheapest">Cheapest First</SelectItem>
                <SelectItem value="gain">Most Gain</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCurrency} onValueChange={setFilterCurrency}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Currencies</SelectItem>
                <SelectItem value="ETH">ETH</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" disabled>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Purchase List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5" />
            Purchases
            {sortedPurchases.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {sortedPurchases.length} results
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded" />
              ))}
            </div>
          ) : sortedPurchases.length > 0 ? (
            <div className="space-y-2 divide-y">
              {sortedPurchases.map((purchase: Purchase) => {
                const gain = (purchase.currentValue || purchase.pricePaid) - purchase.pricePaid;
                const gainPercent = ((gain / purchase.pricePaid) * 100).toFixed(1);

                return (
                  <div key={purchase.id} className="py-4 flex justify-between items-center">
                    <div className="flex items-start gap-4 flex-1">
                      <img
                        src={purchase.image}
                        alt={purchase.nftName}
                        className="w-16 h-16 rounded object-cover"
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold">{purchase.nftName}</h3>
                        <p className="text-sm text-gray-600">{purchase.creatorName}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge
                            variant="outline"
                            className="text-xs"
                          >
                            {purchase.currency}
                          </Badge>
                          <Badge className={`text-xs ${getStatusColor(purchase.status)}`}>
                            {purchase.status.charAt(0).toUpperCase() +
                              purchase.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="text-right mr-4 flex-shrink-0">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-600">
                          Paid: {purchase.pricePaid.toFixed(4)} {purchase.currency}
                        </p>
                        {purchase.currentValue && (
                          <>
                            <p className="font-semibold">
                              Now: {purchase.currentValue.toFixed(4)} {purchase.currency}
                            </p>
                            <p
                              className={`text-sm font-semibold ${
                                gain >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}
                            >
                              <TrendingUp className="w-3 h-3 inline mr-1" />
                              {gain >= 0 ? '+' : ''}{gain.toFixed(4)} ({gainPercent}%)
                            </p>
                          </>
                        )}
                        <p className="text-xs text-gray-600 mt-1">
                          {new Date(purchase.purchaseDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-shrink-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>{purchase.nftName}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <img
                            src={purchase.image}
                            alt={purchase.nftName}
                            className="w-full rounded-lg"
                          />
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Purchase Price:</span>
                              <span className="font-semibold">
                                {purchase.pricePaid} {purchase.currency}
                              </span>
                            </div>
                            {purchase.currentValue && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Current Value:</span>
                                <span className="font-semibold">
                                  {purchase.currentValue} {purchase.currency}
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Date:</span>
                              <span className="font-semibold">
                                {new Date(purchase.purchaseDate).toDateString()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Creator:</span>
                              <span className="font-semibold text-sm">
                                {purchase.creatorName}
                              </span>
                            </div>
                          </div>

                          <div className="p-3 bg-gray-50 rounded text-xs break-all">
                            <p className="text-gray-600 mb-1">Transaction Hash:</p>
                            <p className="font-mono">{purchase.transactionHash}</p>
                          </div>

                          <Button className="w-full bg-blue-600 hover:bg-blue-700">
                            View on Etherscan
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-gray-600">No purchases found</p>
              <p className="text-xs text-gray-500">
                {searchQuery || filterCurrency !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Your purchases will appear here'}
              </p>
              <Button className="mt-4 bg-blue-600 hover:bg-blue-700">
                Browse Marketplace
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {history && history.totalPages > 1 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Page {page} of {history.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              size="sm"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage(Math.min(history.totalPages, page + 1))}
              disabled={page === history.totalPages}
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseHistoryPage;
