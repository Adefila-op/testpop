/**
 * Payout History Page
 * Location: src/pages/creator/PayoutHistoryPage.tsx
 * 
 * View and manage payout transaction history
 */

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useGetPayoutHistory } from '@/hooks/usePayoutStore';
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
import { History, Download, Filter, AlertCircle } from 'lucide-react';

export function PayoutHistoryPage() {
  const { address } = useAccount();
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: history, isLoading } = useGetPayoutHistory(page, 20);

  if (!address) {
    return (
      <div className="space-y-4 p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Connect your wallet to view payout history</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const filteredData = history
    ? history.payouts.filter((payout: any) => {
        const statusMatch = filterStatus === 'all' || payout.status === filterStatus;
        const queryMatch =
          searchQuery === '' ||
          payout.tx_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
          payout.method.toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && queryMatch;
      })
    : [];

  const totalAmount = filteredData.reduce(
    (sum: number, p: any) => sum + parseFloat(p.amount),
    0
  );

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'pending':
        return '⏳';
      case 'failed':
        return '✕';
      default:
        return '○';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold mb-2">Payout History</h1>
        <p className="text-gray-600">Track all your earnings payouts and transactions</p>
      </div>

      {/* Summary */}
      {history && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Paid Out</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{history.totalPaidOut} ETH</p>
              <p className="text-xs text-gray-600 mt-1">
                ${(parseFloat(history.totalPaidOut) * 2500).toFixed(0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{history.totalCount}</p>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Payout Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1 flex-wrap">
                {Array.from(
                  new Set(history.payouts.map((p: any) => p.method))
                ).map((method: any) => (
                  <Badge key={method} variant="outline" className="text-xs">
                    {method}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search by transaction hash or method..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
                <Filter className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
            </div>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" disabled>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Transactions
            {filteredData.length > 0 && (
              <Badge variant="outline" className="ml-auto">
                {filteredData.length} results
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded" />
              ))}
            </div>
          ) : filteredData.length > 0 ? (
            <div className="space-y-2 divide-y">
              {filteredData.map((payout: any) => (
                <div key={payout.id} className="py-4 flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge className={`w-8 h-8 flex items-center justify-center ${getStatusColor(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                      </Badge>
                      <div>
                        <p className="font-semibold text-sm">
                          {payout.amount} {payout.method}
                        </p>
                        <p className="text-xs text-gray-600">
                          {new Date(payout.created_at).toLocaleDateString()}{' '}
                          {new Date(payout.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="ml-11 space-y-1">
                      <p className="text-xs text-gray-600">
                        Transaction: {payout.tx_hash.slice(0, 10)}...
                        {payout.tx_hash.slice(-8)}
                      </p>
                      {payout.address && (
                        <p className="text-xs text-gray-600">
                          To: {payout.address.slice(0, 6)}...
                          {payout.address.slice(-4)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <p className="text-sm font-semibold text-green-600">
                      +{payout.amount}
                    </p>
                    <Badge variant="outline" className="text-xs mt-1">
                      {payout.method}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-2">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-gray-600">No payouts found</p>
              <p className="text-xs text-gray-500">
                {filterStatus !== 'all' || searchQuery
                  ? 'Try adjusting your filters'
                  : 'Your payouts will appear here'}
              </p>
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

      {/* Info Box */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6 flex gap-4">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-900">
              How Payouts Work
            </p>
            <p className="text-sm text-blue-800">
              Earnings are calculated daily and made available for claim. You can choose
              your preferred payout method (ETH, USDC, USDT) and claim whenever you're
              ready. Payouts are processed within 24 hours.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PayoutHistoryPage;
