/**
 * ERROR BOUNDARIES & ASYNC ERROR HANDLING
 * 
 * Prevents component crashes from becoming full app crashes
 */

// ============================================
// ERROR BOUNDARY COMPONENT
// ============================================
// File: src/components/ErrorBoundary.tsx

import React, { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  level?: 'page' | 'component' | 'section'; // Isolation level
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging
    console.error('ErrorBoundary caught error:', error, errorInfo);

    // Send to error tracking service
    if (window.Sentry) {
      window.Sentry.captureException(error, { contexts: { react: errorInfo } });
    }

    this.setState({ errorInfo });

    // Call optional callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error boundary if resetKeys changed
    if (this.props.resetKeys?.length !== prevProps.resetKeys?.length ||
        this.props.resetKeys?.some((key, i) => key !== prevProps.resetKeys?.[i])) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const level = this.props.level || 'component';

      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`
          ${level === 'page' ? 'min-h-screen' : 'p-4 border border-red-200 rounded-lg'} 
          flex flex-col items-center justify-center 
          ${level === 'page' ? 'bg-gradient-to-b from-red-50 to-white' : 'bg-red-50'}
        `}>
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          
          <h1 className="text-2xl font-bold text-red-900 mb-2">
            {level === 'page' ? 'Page Error' : 'Component Error'}
          </h1>
          
          <p className="text-red-700 mb-4 text-center max-w-md">
            Something went wrong. The error has been logged and our team has been notified.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="w-full max-w-md bg-red-100 p-4 rounded mb-4 text-sm font-mono">
              <summary className="cursor-pointer font-bold text-red-900 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-red-800 overflow-auto max-h-48">
                {this.state.error.toString()}
                {'\n\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}

          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="mt-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// ============================================
// APP-LEVEL ERROR BOUNDARY
// ============================================
// File: src/App.tsx (wrap app)

import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary level="page">
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <WalletProvider>
            <Router>
              {/* Routes here */}
            </Router>
          </WalletProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

// ============================================
// PAGE-LEVEL ERROR BOUNDARIES
// ============================================
// File: src/pages/DropsPage.tsx (example)

import ErrorBoundary from '@/components/ErrorBoundary';

export function DropsPage() {
  const [filters, setFilters] = useState({});

  return (
    <div className="space-y-4">
      <ErrorBoundary 
        level="section"
        resetKeys={[filters]}
      >
        <DropFilters onFilterChange={setFilters} />
      </ErrorBoundary>

      <ErrorBoundary 
        level="section"
        resetKeys={[filters]}
      >
        <DropsList filters={filters} />
      </ErrorBoundary>
    </div>
  );
}

// ============================================
// ASYNC ERROR HANDLING HOOK
// ============================================
// File: src/hooks/useAsyncError.ts

import { useState, useCallback } from 'react';

export function useAsyncError() {
  const [, setError] = useState();

  return useCallback((error: any) => {
    setError(() => {
      throw error;
    });
  }, [setError]);
}

// ============================================
// HOOK WITH AUTOMATIC ERROR HANDLING
// ============================================
// File: src/hooks/useAsync.ts

import { useEffect, useState } from 'react';
import { useAsyncError } from './useAsyncError';

interface AsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
  dependencies: any[] = []
) {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null
  });

  const throwError = useAsyncError();

  useEffect(() => {
    if (!immediate) return;

    let isMounted = true;
    const execute = async () => {
      setState({ status: 'pending', data: null, error: null });

      try {
        const response = await asyncFunction();
        if (isMounted) {
          setState({ status: 'success', data: response, error: null });
        }
      } catch (error) {
        if (isMounted) {
          const err = error instanceof Error ? error : new Error(String(error));
          setState({ status: 'error', data: null, error: err });
          throwError(err); // This throws to error boundary
        }
      }
    };

    execute();

    return () => {
      isMounted = false;
    };
  }, dependencies);

  return state;
}

// ============================================
// COMPREHENSIVE HOOK WITH CLEANUP
// ============================================
// File: src/hooks/useSafeAsync.ts

import { useEffect, useState, useRef } from 'react';

export function useSafeAsync<T>(
  asyncFunction: () => Promise<T>,
  dependencies: any[] = []
) {
  const [state, setState] = useState<{
    loading: boolean;
    data: T | null;
    error: Error | null;
  }>({
    loading: true,
    data: null,
    error: null
  });

  const containerRef = useRef({ isMounted: true });

  useEffect(() => {
    containerRef.current.isMounted = true;

    const execute = async () => {
      try {
        const response = await asyncFunction();
        
        if (containerRef.current.isMounted) {
          setState({
            loading: false,
            data: response,
            error: null
          });
        }
      } catch (error) {
        if (containerRef.current.isMounted) {
          setState({
            loading: false,
            data: null,
            error: error instanceof Error ? error : new Error(String(error))
          });
        }
      }
    };

    execute();

    return () => {
      containerRef.current.isMounted = false;
    };
  }, dependencies);

  return state;
}

// ============================================
// USAGE EXAMPLES
// ============================================

/*
Example 1: Wrap entire page
---------------------------------
export function HomePage() {
  return (
    <ErrorBoundary level="page">
      <Header />
      <Hero />
      <Features />
      <Footer />
    </ErrorBoundary>
  );
}

Example 2: Wrap sections
---------------------------------
export function ProductsPage() {
  return (
    <div>
      <Header />
      
      <ErrorBoundary level="section">
        <ProductFilters />
      </ErrorBoundary>

      <ErrorBoundary level="section">
        <ProductGrid />
      </ErrorBoundary>

      <Footer />
    </div>
  );
}

Example 3: Async with auto error handling
---------------------------------
function DropDetailPage() {
  const { status, data: drop, error } = useAsync(
    () => fetchDrop(dropId),
    true,
    [dropId]
  );

  if (status === 'pending') return <Loading />;
  if (error) return <ErrorDisplay error={error} />; // Error boundary will catch
  if (!drop) return <NotFound />;

  return <DropDetail drop={drop} />;
}

Example 4: Safe async with unsubscribe
---------------------------------
function MySubscriptionsPage() {
  const { loading, data: subs, error } = useSafeAsync(
    () => fetchUserSubscriptions(),
    []
  );

  // Automatically cleans up if component unmounts
  // No unsubscribe needed, handles cleanup

  if (loading) return <Loading />;
  if (error) return <ErrorDisplay error={error} />;

  return <SubscriptionsList subs={subs} />;
}

Example 5: Handle network errors gracefully
---------------------------------
function CheckoutPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckout = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const order = await createOrder(cartData);
      navigateTo(`/payment/${order.id}`);
    } catch (err) {
      setError(err.message);
      console.error('Checkout failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div>
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button onClick={handleCheckout} disabled={isProcessing}>
        Proceed to Payment
      </Button>
    </div>
  );
}
*/
