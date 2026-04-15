/**
 * Products Hook - Product marketplace operations
 * Handles product CRUD, purchases, and listings
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { SECURE_API_BASE } from '@/lib/apiBase';

export interface Product {
  id: string;
  tokenId: string;
  name: string;
  description: string;
  price: string;
  priceEth: string;
  creator: string;
  creatorId: string;
  imageUrl: string;
  status: 'active' | 'sold' | 'draft';
  totalSales: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  description: string;
  price: string; // in wei
  imageUrl: string;
  metadata?: Record<string, any>;
}

export interface PurchaseEstimate {
  gasEstimate: string;
  gasCostEth: string;
  totalCostEth: string;
  totalCostWei: string;
}

export interface UseProductsReturn {
  // Queries
  products: Product[] | null;
  product: Product | null;
  isLoadingProducts: boolean;
  isLoadingProduct: boolean;
  
  // Mutations
  createProduct: (input: CreateProductInput) => Promise<{ id: string; tokenId: string }>;
  purchaseProduct: (productId: string) => Promise<{ hash: string; tokenId: string }>;
  estimateGas: (productId: string) => Promise<PurchaseEstimate>;
  
  // Status
  isCreating: boolean;
  isPurchasing: boolean;
  isEstimating: boolean;
  error: Error | null;
}

export function useProducts(creatorFilter?: string): UseProductsReturn {
  // Fetch products list
  const {
    data: products,
    isLoading: isLoadingProducts,
  } = useQuery({
    queryKey: ['products', creatorFilter],
    queryFn: async () => {
      const url = creatorFilter
        ? `${SECURE_API_BASE}/products?creatorId=${creatorFilter}`
        : `${SECURE_API_BASE}/products`;
      
      const response = await fetch(url, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      return data.products as Product[];
    },
    staleTime: 30000,
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (input: CreateProductInput) => {
      const response = await fetch(`${SECURE_API_BASE}/products/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      
      if (!response.ok) throw new Error('Failed to create product');
      return response.json();
    },
  });

  // Purchase product mutation
  const purchaseMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`${SECURE_API_BASE}/products/${productId}/purchase`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to purchase product');
      return response.json();
    },
  });

  // Estimate gas for purchase
  const estimateMutation = useMutation({
    mutationFn: async (productId: string) => {
      const response = await fetch(`${SECURE_API_BASE}/products/${productId}/purchase-estimate`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to estimate gas');
      return response.json();
    },
  });

  return {
    products: products || null,
    product: null,
    isLoadingProducts,
    isLoadingProduct: false,
    
    createProduct: (input) => createMutation.mutateAsync(input),
    purchaseProduct: (productId) => purchaseMutation.mutateAsync(productId),
    estimateGas: (productId) => estimateMutation.mutateAsync(productId),
    
    isCreating: createMutation.isPending,
    isPurchasing: purchaseMutation.isPending,
    isEstimating: estimateMutation.isPending,
    error: createMutation.error || purchaseMutation.error || estimateMutation.error || null,
  };
}

/**
 * Single product hook
 */
export function useProduct(productId: string) {
  const {
    data: product,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const response = await fetch(`${SECURE_API_BASE}/products/${productId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch product');
      return response.json() as Promise<Product>;
    },
    enabled: !!productId,
    staleTime: 30000,
  });

  return { product: product || null, isLoading, error };
}
