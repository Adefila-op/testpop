/**
 * Transaction State Management Hook
 * Manages transaction lifecycle: pending, success, error, confirmation
 */

import { useState, useCallback } from 'react';

export interface TransactionState {
  hash: string | null;
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  error: Error | null;
  confirmations: number;
}

export interface UseTransactionStateReturn {
  state: TransactionState;
  setPending: (hash: string) => void;
  setConfirmed: () => void;
  setError: (error: Error) => void;
  reset: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
}

const initialState: TransactionState = {
  hash: null,
  status: 'idle',
  error: null,
  confirmations: 0,
};

export function useTransactionState(): UseTransactionStateReturn {
  const [state, setState] = useState<TransactionState>(initialState);

  const setPending = useCallback((hash: string) => {
    setState({
      hash,
      status: 'pending',
      error: null,
      confirmations: 0,
    });
  }, []);

  const setConfirmed = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'confirming',
      confirmations: prev.confirmations + 1,
    }));
  }, []);

  const setSuccess = useCallback(() => {
    setState((prev) => ({
      ...prev,
      status: 'success',
    }));
  }, []);

  const setError = useCallback((error: Error) => {
    setState({
      hash: null,
      status: 'error',
      error,
      confirmations: 0,
    });
  }, []);

  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    state,
    setPending,
    setConfirmed,
    setError,
    reset,
    isLoading: state.status === 'pending' || state.status === 'confirming',
    isSuccess: state.status === 'success',
    isError: state.status === 'error',
  };
}
