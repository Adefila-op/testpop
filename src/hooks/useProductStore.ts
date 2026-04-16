/**
 * Product Store Hooks
 * Location: src/hooks/useProductStore.ts
 * 
 * Wagmi hooks for product creation, purchases, and management
 */

import { useReadContract, useWriteContract, useAccount } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { parseEther, formatEther } from "ethers";
import { PRODUCT_STORE_ADDRESS } from "@/constants/addresses";
import { ProductStoreABI } from "@/constants/abis";

/**
 * Create a new product on the blockchain
 * @param productData - Product details (name, description, price, etc.)
 * @returns Transaction write function and status
 */
export function useCreateProduct() {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { write, isLoading, isError, error, data } = useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: "createProduct",
    onSuccess(data) {
      console.log("✅ Product creation initiated:", data.hash);
      // Product saved to backend API after confirmation
    },
    onError(error) {
      console.error("❌ Product creation failed:", error);
    },
  });

  // Call backend API after transaction confirms
  const { mutate: saveProductMetadata } = useMutation({
    mutationFn: async (productData) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productData),
      });
      if (!response.ok) throw new Error("Failed to save product");
      return response.json();
    },
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  return {
    write,
    isLoading,
    isError,
    error,
    saveMetadata: saveProductMetadata,
  };
}

/**
 * Purchase a product and receive NFT
 * @param productId - Product ID to purchase
 * @param quantity - Number to buy
 * @returns Purchase transaction function
 */
export function usePurchaseProduct(productId: number) {
  const { address } = useAccount();
  const queryClient = useQueryClient();

  const { write, isLoading, isError, error, data } = useContractWrite({
    address: PRODUCT_STORE_ADDRESS,
    abi: ProductStoreABI,
    functionName: "purchaseProduct",
    onSuccess(data) {
      console.log("✅ Purchase successful:", data.hash);
      queryClient.invalidateQueries({ queryKey: ["user-nfts"] });
      queryClient.invalidateQueries({ queryKey: ["products", productId] });
    },
    onError(error) {
      console.error("❌ Purchase failed:", error);
    },
  });

  return {
    write: (quantity: number) => {
      write?.({ args: [productId, quantity] });
    },
    isLoading,
    isError,
    error,
  };
}

/**
 * Estimate gas cost for a purchase transaction
 * @param productId - Product ID
 * @param quantity - Quantity to estimate
 * @returns Gas estimate data
 */
export function useGetPurchaseEstimate(productId: number, quantity: number) {
  return useQuery({
    queryKey: ["purchase-estimate", productId, quantity],
    queryFn: async () => {
      const response = await fetch(
        `/api/products/${productId}/purchase-estimate?quantity=${quantity}`
      );
      if (!response.ok) throw new Error("Failed to estimate");
      return response.json();
    },
    enabled: !!productId && quantity > 0,
    staleTime: 30000, // 30 seconds
  });
}

export function useGetProducts(category?: string, creatorId?: string) {
  return useQuery({
    queryKey: ["products", { category, creatorId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (category) params.append("category", category);
      if (creatorId) params.append("creator_id", creatorId);

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get product details with creator info
 * @param productId - Product ID
 * @returns Product data including creator
 */
export function useGetProduct(productId: number) {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const response = await fetch(`/api/products/${productId}`);
      if (!response.ok) throw new Error("Failed to fetch product");
      return response.json();
    },
    enabled: !!productId,
  });
}

/**
 * Get user's purchased NFTs
 * @returns User's NFT collection
 */
export function useGetUserNFTs() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["user-nfts", address],
    queryFn: async () => {
      const response = await fetch(`/api/nfts/user/${address}`);
      if (!response.ok) throw new Error("Failed to fetch NFTs");
      return response.json();
    },
    enabled: !!address,
  });
}

/**
 * Get purchase history for user
 * @returns User's purchase transactions
 */
export function useGetPurchaseHistory() {
  const { address } = useAccount();

  return useQuery({
    queryKey: ["purchase-history", address],
    queryFn: async () => {
      const response = await fetch(`/api/purchases/user/${address}`);
      if (!response.ok) throw new Error("Failed to fetch history");
      return response.json();
    },
    enabled: !!address,
    staleTime: 60000,
  });
}

/**
 * Alias for useGetPurchaseEstimate
 */
export function useEstimatePurchaseGas(productId: number, quantity: number) {
  return useGetPurchaseEstimate(productId, quantity);
}


export default {
  useCreateProduct,
  usePurchaseProduct,
  useGetPurchaseEstimate,
  useGetProduct,
  useGetProducts,
  useGetUserNFTs,
  useGetPurchaseHistory,
};
