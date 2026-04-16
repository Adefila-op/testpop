/**
 * Auction Timer Component
 * Location: src/components/phase3/auction/AuctionTimer.tsx
 * 
 * Countdown timer with auto-extension detection for auctions
 */

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AuctionTimerProps {
  endTime: number; // Unix timestamp in seconds
  status: 'active' | 'extended' | 'ending' | 'ended';
  extendCount?: number;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function AuctionTimer({ endTime, status, extendCount = 0 }: AuctionTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [isEnding, setIsEnding] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = Math.floor(Date.now() / 1000);
      const diff = Math.max(0, endTime - now);

      const days = Math.floor(diff / (24 * 3600));
      const hours = Math.floor((diff % (24 * 3600)) / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;

      setTimeRemaining({ days, hours, minutes, seconds, total: diff });
      setIsEnding(diff > 0 && diff <= 600); // Last 10 minutes
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  if (!timeRemaining) {
    return <div className="text-sm text-gray-500">Loading...</div>;
  }

  if (status === 'ended' || timeRemaining.total === 0) {
    return (
      <div className="space-y-2">
        <Badge variant="secondary" className="w-full justify-center">
          <Trophy className="w-4 h-4 mr-2" />
          Auction Ended
        </Badge>
      </div>
    );
  }

  const getStatusColor = () => {
    if (status === 'extended') return 'bg-blue-100 text-blue-800';
    if (isEnding) return 'bg-red-100 text-red-800';
    return 'bg-green-100 text-green-800';
  };

  const getStatusLabel = () => {
    if (status === 'extended') return 'Extended';
    if (isEnding) return 'Ending Soon!';
    return 'Active';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className={`w-5 h-5 ${isEnding ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
          <span className="font-semibold text-sm">Time Remaining</span>
        </div>
        <Badge className={getStatusColor()}>
          {getStatusLabel()}
        </Badge>
      </div>

      {/* Time Display */}
      <div className="grid grid-cols-4 gap-2">
        <div className="text-center p-2 bg-slate-100 rounded">
          <div className="text-2xl font-bold text-slate-900">{timeRemaining.days}</div>
          <div className="text-xs text-gray-600 uppercase">Days</div>
        </div>
        <div className="text-center p-2 bg-slate-100 rounded">
          <div className="text-2xl font-bold text-slate-900">{String(timeRemaining.hours).padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 uppercase">Hrs</div>
        </div>
        <div className="text-center p-2 bg-slate-100 rounded">
          <div className="text-2xl font-bold text-slate-900">{String(timeRemaining.minutes).padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 uppercase">Mins</div>
        </div>
        <div className="text-center p-2 bg-slate-100 rounded">
          <div className="text-2xl font-bold text-slate-900">{String(timeRemaining.seconds).padStart(2, '0')}</div>
          <div className="text-xs text-gray-600 uppercase">Secs</div>
        </div>
      </div>

      {/* Extensions Info */}
      {extendCount > 0 && (
        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200">
          <AlertTriangle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-700">
            <p className="font-semibold">Auction Extended {extendCount}x</p>
            <p>Auction auto-extends when bids are placed in the final 10 minutes</p>
          </div>
        </div>
      )}

      {/* Ending Soon Warning */}
      {isEnding && (
        <div className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200 animate-pulse">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-red-700 font-semibold">
            Auction ending soon! Place your bid now before it's too late!
          </div>
        </div>
      )}
    </div>
  );
}

export default AuctionTimer;
