/**
 * N+1 QUERY OPTIMIZATION & SEARCH REQUEST DEBOUNCING
 * 
 * Prevents database overload from inefficient queries
 */

// ============================================
// PROBLEM: N+1 Queries
// ============================================

/*
BEFORE (N+1 Problem):
Loading 100 drops = 101 database queries!

1 query: SELECT * FROM drops (100 rows)
100 queries: SELECT * FROM artists WHERE id = ?
           (one for each drop to get artist data)

Total: 101 queries!

If each query takes 50ms:
101 * 50ms = 5,050ms = 5 SECONDS to load!
*/

// ============================================
// FIXED: Join in Single Query
// ============================================
// File: src/lib/supabaseStore.ts

import { useSupabaseClient } from '@supabase/auth-helpers-react';

export function useDropsWithArtistsFixed() {
  const supabase = useSupabaseClient();

  // BEFORE (N+1):
  // const { data: drops } = supabase
  //   .from('drops')
  //   .select('*, artist_id'); // Only drop columns!
  // 
  // // Then in component:
  // useEffect(() => {
  //   drops?.forEach(drop => {
  //     supabase
  //       .from('artists')
  //       .select('*')
  //       .eq('id', drop.artist_id)
  //       .single();  // 100 queries!
  //   });
  // }, [drops]);

  // AFTER (FIXED - Single Join):
  return supabase
    .from('drops')
    .select(`
      *,
      artist:artist_id (
        id,
        name,
        avatar_url,
        bio,
        verified
      )
    `) // Foreign key join!
    .order('created_at', { ascending: false });
}

// ============================================
// SOLUTION: Query Optimization Patterns
// ============================================
// File: src/lib/supabaseStore.ts

/**
 * Pattern 1: Simple Join
 */
export async function getDropsWithArtists(supabase) {
  return supabase
    .from('drops')
    .select(`
      *,
      artist:artist_id (*)  // Join artist data
    `)
    .order('created_at', { ascending: false })
    .limit(50);
}

/**
 * Pattern 2: Multiple Joins
 */
export async function getOrdersWithDetails(supabase, userId) {
  return supabase
    .from('orders')
    .select(`
      *,
      drop:drop_id (
        id,
        title,
        image_url
      ),
      artist:drop_id -> artist_id (
        id,
        name
      )
    `)
    .eq('buyer_address', userId)
    .order('created_at', { ascending: false });
}

/**
 * Pattern 3: Nested Joins
 */
export async function getArtistsWithDropsAndCampaigns(supabase) {
  return supabase
    .from('artists')
    .select(`
      *,
      drops (
        id,
        title,
        price_eth
      ),
      campaigns (
        id,
        name,
        status
      )
    `)
    .limit(20);
}

/**
 * Pattern 4: Aggregations (Count without N+1)
 */
export async function getDropsWithMintCount(supabase) {
  return supabase
    .from('drops')
    .select(`
      *,
      artist:artist_id (name),
      mints:orders(count)  // COUNT without N+1!
    `)
    .order('created_at', { ascending: false });
}

// ============================================
// DEBOUNCING & ABORTING SEARCH REQUESTS
// ============================================
// File: src/pages/MarketplacePage.tsx

import { useEffect, useRef, useState } from 'react';
import { useDebouncedCallback } from 'use-debounce';

export function MarketplacePageFixed() {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // BEFORE (Broken - 7 concurrent requests on 'abstract'):
  // const handleSearch = (query: string) => {
  //   setSearchQuery(query);
  //   // Make API call immediately
  //   fetch(`/api/search?q=${query}`)
  //     .then(r => r.json())
  //     .then(setResults);
  // };

  // AFTER (FIXED - Single request with debounce + abort):
  const performSearch = useDebouncedCallback(
    async (query: string) => {
      if (!query.trim()) {
        setResults([]);
        return;
      }

      // Abort previous request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);

      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}`,
          {
            signal: abortControllerRef.current.signal,
            headers: { 'Content-Type': 'application/json' }
          }
        );

        if (!response.ok) throw new Error('Search failed');

        const data = await response.json();
        setResults(data);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Request was cancelled, that's fine
          return;
        }
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    300 // Wait 300ms after user stops typing before searching
  );

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    performSearch(query);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div>
      <input
        type="text"
        value={searchQuery}
        onChange={handleSearchInput}
        placeholder="Search drops..."
      />

      {isLoading && <div>Searching...</div>}
      {results.length > 0 && <DropsList drops={results} />}
    </div>
  );
}

// ============================================
// BACKEND: OPTIMIZE FREQUENTLY QUERIED ENDPOINTS
// ============================================
// File: server/api/drops.js

export async function getDropsHandler(req, res, supabaseAdmin) {
  try {
    const { limit = 20, offset = 0, search } = req.query;

    // BEFORE (N+1):
    // const { data: drops } = await supabaseAdmin
    //   .from('drops')
    //   .select('*')
    //   .range(offset, offset + limit);
    // 
    // const dropsWithArtists = await Promise.all(
    //   drops.map(drop =>
    //     supabaseAdmin
    //       .from('artists')
    //       .select('*')
    //       .eq('id', drop.artist_id)
    //       .single()
    //       .then(res => ({ ...drop, artist: res.data }))
    //   )
    // ); // 21 queries!

    // AFTER (OPTIMIZED - Single Query with Join):
    let query = supabaseAdmin
      .from('drops')
      .select(`
        *,
        artist:artist_id (
          id,
          name,
          avatar_url,
          bio,
          verified,
          twitter,
          website
        )
      `, { count: 'exact' }) // Get total count
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    // Apply filters
    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data: drops, error, count } = await query
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      data: drops,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ============================================
// CACHING LAYER (Additional Optimization)
// ============================================
// File: src/lib/queryCache.ts

import NodeCache from 'node-cache';

// Simple cache with 5 minute TTL
const cache = new NodeCache({ stdTTL: 300 });

export function getCachedDrops(filters: Record<string, any>) {
  const cacheKey = `drops:${JSON.stringify(filters)}`;

  const cached = cache.get<any[]>(cacheKey);
  if (cached) return cached;

  return null;
}

export function setCachedDrops(filters: Record<string, any>, data: any[]) {
  const cacheKey = `drops:${JSON.stringify(filters)}`;
  cache.set(cacheKey, data);
}

export function invalidateDropsCache() {
  // Clear all drop caches when data changes
  const keys = cache.keys();
  keys.forEach(key => {
    if (key.startsWith('drops:')) {
      cache.del(key);
    }
  });
}

// ============================================
// DATABASE: Add Indexes for Common Queries
// ============================================
// File: supabase/migrations/008_add_indexes.sql

-- Index for artist lookup
CREATE INDEX idx_drops_artist_id ON drops(artist_id);

-- Index for status filtering
CREATE INDEX idx_drops_status ON drops(status);

-- Index for searching
CREATE INDEX idx_drops_title ON drops USING gin(title gin_trgm_ops);

-- Composite index for common queries
CREATE INDEX idx_orders_buyer_created 
  ON orders(buyer_address, created_at DESC);

-- Products inventory
CREATE INDEX idx_products_status_inventory 
  ON products(status, inventory);

-- Subscriptions
CREATE INDEX idx_subscriptions_subscriber 
  ON subscriptions(subscriber_address);

-- ============================================
// TESTING QUERY PERFORMANCE
// ============================================

/*
Before optimization: 5000ms (101 queries)
After optimization: 150ms (1 query)

Test it:
1. npm run dev
2. Open DevTools → Network
3. Load page with 100 items
4. Check waterfall - should show single API call
5. Check timing - should be fast

Benchmark:
You can use k6 for load testing:

import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },
    { duration: '1m', target: 200 },
  ],
};

export default function () {
  let res = http.get('http://localhost:3000/api/drops?limit=50');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}

Run: k6 run load-test.js
*/

// ============================================
// SUMMARY
// ============================================

/*
OPTIMIZATION CHECKLIST:

Before deployment, verify:

[ ] All GET endpoints use joins, not N+1
[ ] Search/filter endpoints have debouncing (300ms)
[ ] Search/filter requests are abortable
[ ] Database indexes exist for common filters
[ ] Query results are cached when appropriate
[ ] Pagination is implemented (limit + offset)
[ ] Unnecessary fields removed from SELECT
[ ] Complex queries tested with 1000+ items

Expected results:
- Drop list: <200ms
- Search: <500ms
- Dashboard: <1000ms
- All endpoints: <2 second SLA
*/
