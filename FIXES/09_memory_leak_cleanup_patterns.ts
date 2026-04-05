/**
 * MEMORY LEAK FIXES & CLEANUP PATTERNS
 * Common patterns in detail pages causing crashes
 */

// ============================================
// PATTERN 1: Unsubscribe from Subscriptions
// ============================================
// File: src/pages/DropDetailPage.tsx (FIXED)

import { useEffect, useRef } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export function DropDetailPageFixed({ dropId }: { dropId: string }) {
  const supabase = useSupabaseClient();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // BEFORE (Memory leak):
    // const subscription = supabase
    //   .from('drops')
    //   .on('*', payload => {
    //     setDrop(payload.new);
    //   });
    // // Missing: unsubscribe cleanup!

    // AFTER (Fixed):
    const subscription = supabase
      .from('drops')
      .on('*', payload => {
        setDrop(payload.new);
      })
      .subscribe();

    unsubscribeRef.current = () => {
      subscription.unsubscribe();
    };

    // Cleanup function called on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [dropId, supabase]);

  return <DropDetail />;
}

// ============================================
// PATTERN 2: AbortController for Fetch
// ============================================
// File: src/hooks/useFetch.ts

import { useEffect, useRef, useState } from 'react';

export function useFetch<T>(
  url: string,
  dependencies: any[] = []
) {
  const [state, setState] = useState<{
    data: T | null;
    loading: boolean;
    error: Error | null;
  }>({
    data: null,
    loading: true,
    error: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // BEFORE (Memory leak on unmount):
    // fetch(url)
    //   .then(r => r.json())
    //   .then(data => setState({ data, loading: false, error: null }))
    //   .catch(e => setState({ data: null, loading: false, error: e }));
    // // If component unmounts, setState still called = memory leak warning

    // AFTER (Fixed):
    abortControllerRef.current = new AbortController();

    const fetchData = async () => {
      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current?.signal
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);

        const data = await response.json();

        setState({ data, loading: false, error: null });
      } catch (error) {
        // Don't set state if aborted (component unmounted)
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setState({ 
          data: null, 
          loading: false, 
          error: error instanceof Error ? error : new Error(String(error))
        });
      }
    };

    fetchData();

    // Cleanup: abort fetch on unmount
    return () => {
      abortControllerRef.current?.abort();
    };
  }, dependencies);

  return state;
}

// ============================================
// PATTERN 3: Event Listener Cleanup
// ============================================
// File: src/pages/ProductDetailPage.tsx (FIXED)

import { useEffect, useState } from 'react';

export function ProductDetailPageFixed({ productId }: { productId: string }) {
  const [quantity, setQuantity] = useState(1);

  // BEFORE (Memory leak - event listener never removed):
  // useEffect(() => {
  //   window.addEventListener('resize', handleResize);
  //   // Missing: removeEventListener!
  // }, []);

  // AFTER (Fixed):
  useEffect(() => {
    const handleResize = () => {
      // Responsive layout adjustments
    };

    window.addEventListener('resize', handleResize);

    // Cleanup: remove listener on unmount
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // BEFORE (Memory leak - timer never cleared):
  // useEffect(() => {
  //   const timeout = setTimeout(() => {
  //     setQuantity(0);
  //   }, 5000);
  //   // Missing: clearTimeout!
  // }, []);

  // AFTER (Fixed):
  useEffect(() => {
    const timeout = setTimeout(() => {
      setQuantity(0);
    }, 5000);

    // Cleanup: clear timeout on unmount
    return () => {
      clearTimeout(timeout);
    };
  }, []);

  return <ProductDetail quantity={quantity} />;
}

// ============================================
// PATTERN 4: React Query Cleanup
// ============================================
// File: src/hooks/useDropData.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiBase';

/**
 * React Query automatically handles cleanup!
 * But ensure it's configured correctly
 */
export function useDropData(dropId: string) {
  return useQuery({
    queryKey: ['drop', dropId],
    queryFn: () => apiClient.get(`/drops/${dropId}`),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (cleanup after this)
    // Old config names (deprecated):
    // cacheTime: 10 * 60 * 1000, // RENAME TO gcTime!
  });
}

// In component:
function MyComponent() {
  // Query automatically cleaned up on unmount
  const { data: drop, isLoading, error } = useDropData('123');
  return <div>{drop?.name}</div>;
}

// ============================================
// PATTERN 5: Zustand Store Cleanup
// ============================================
// File: src/stores/cartStore.ts (FIXED)

import { create } from 'zustand';
import { useEffect } from 'react';

const useCartStore = create(set => ({
  items: [],
  addItem: (item) => set(state => ({ 
    items: [...state.items, item] 
  }))
}));

// BEFORE (Memory leak - subscription never unsubscribed):
// function CartWidget() {
//   useEffect(() => {
//     const unsubscribe = useCartStore.subscribe(
//       state => state.items,
//       items => console.log('Cart updated:', items)
//     );
//     // Missing: cleanup!
//   }, []);
// }

// AFTER (Fixed):
function CartWidget() {
  useEffect(() => {
    const unsubscribe = useCartStore.subscribe(
      state => state.items,
      items => console.log('Cart updated:', items)
    );

    // Cleanup: unsubscribe on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  // Or use hook pattern (simpler):
  const items = useCartStore(state => state.items);

  return <div>{items.length} items</div>;
}

// ============================================
// PATTERN 6: Reference Cleanup Checklist
// ============================================

/*
Memory leak checklist - check every useEffect:

[ ] fetch/async calls
    Use AbortController
    return () => controller.abort()

[ ] event listeners
    return () => element.removeEventListener(...)

[ ] timers/intervals
    return () => { clearTimeout(...); clearInterval(...); }

[ ] subscriptions (Supabase, Socket.io)
    return () => subscription.unsubscribe()

[ ] Zustand/Redux subscriptions
    return () => unsubscribe()

[ ] requestAnimationFrame
    return () => cancelAnimationFrame(id)

[ ] IntersectionObserver
    return () => observer.disconnect()

[ ] ResizeObserver
    return () => observer.disconnect()

[ ] MutationObserver
    return () => observer.disconnect()

No missing return () => cleanup:
    Potential memory leak!
*/

// ============================================
// TESTING FOR MEMORY LEAKS
// ============================================

/*
Developer Tools Method:
1. Open DevTools → Performance
2. Take heap snapshot
3. Navigate to page
4. Navigate away
5. Take another heap snapshot
6. Compare - should be smaller or similar
7. If larger, memory leaked!

Automated Testing (with React DevTools Profiler):
import { Profiler } from 'react';

<Profiler id="PageName" onRender={onRenderCallback}>
  <YourComponent />
</Profiler>

// Check which components are re-rendering unnecessarily
*/

// ============================================
// SAFE PATTERNS TO USE
// ============================================

// ✅ GOOD: useSafeAsync hook
// Returns immediately if component unmounted
function ProfilePage() {
  const { data: profile, loading, error } = useSafeAsync(
    () => fetchProfile(),
    []
  );
  return <Profile data={profile} />;
}

// ✅ GOOD: useQuery with React Query
// Handles all cleanup automatically
function DropsPage() {
  const { data: drops } = useQuery({
    queryKey: ['drops'],
    queryFn: () => fetchDrops()
  });
  return <DropsList drops={drops} />;
}

// ✅ GOOD: AbortController
function SearchPage() {
  const [results, setResults] = useState([]);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/api/search', { signal: controller.signal })
      .then(r => r.json())
      .then(data => setResults(data))
      .catch(e => {
        if (e.name !== 'AbortError') console.error(e);
      });

    return () => controller.abort();
  }, []);

  return <Results results={results} />;
}

// ❌ BAD: Missing cleanup
function BadComponent() {
  useEffect(() => {
    fetch('/api/data').then(r => r.json()).then(setData);
    // Missing: return () => { cleanup }
  }, []);
}

// ❌ BAD: Forgetting to unsubscribe
function BadSubscription() {
  useEffect(() => {
    const sub = stream.subscribe(data => setData(data));
    // Missing: return () => sub.unsubscribe()
  }, []);
}

export { useFetch };
