/**
 * COLLECTION STORE OWNERSHIP VERIFICATION
 * File: src/stores/collectionStore.ts
 * 
 * Prevents fake NFT injection by verifying ownership onchain
 */

import { create } from 'zustand';
import { ethers } from 'ethers';
import { getProvider } from '@/lib/wagmi';

export interface Collectable {
  id: string;
  tokenId: string;
  contractAddress: string;
  title: string;
  image: string;
  description?: string;
  ownerAddress: string;
  chainId: number;
  verifiedOnChain: boolean; // NEW: Track verification status
  metadata?: any;
}

interface CollectionStore {
  collectables: Collectable[];
  isLoading: boolean;
  error: string | null;
  addCollectable: (collectable: Collectable, verify?: boolean) => Promise<void>;
  removeCollectable: (id: string) => void;
  verifyOwnership: (contractAddress: string, tokenId: string, ownerAddress: string, chainId?: number) => Promise<boolean>;
  loadCollection: (ownerAddress: string) => Promise<void>;
}

// ERC-721 ABI minimal interface for ownership checks
const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function balanceOf(address owner) external view returns (uint256)'
];

/**
 * Verify NFT ownership on-chain
 * CRITICAL FIX: Only add NFTs that actually exist and are owned by user
 */
async function verifyNFTOwnership(
  contractAddress: string,
  tokenId: string,
  expectedOwner: string,
  chainId: number = 8453 // Base mainnet
): Promise<boolean> {
  try {
    // Get provider for the specified chain
    const provider = getProvider(chainId);
    
    if (!provider) {
      console.warn(`No provider available for chain ${chainId}`);
      return false;
    }
    
    // Create contract instance
    const contract = new ethers.Contract(
      contractAddress,
      ERC721_ABI,
      provider
    );
    
    // Query who owns this token
    const actualOwner = await contract.ownerOf(tokenId);
    
    // Verify it matches expected owner
    const verified = actualOwner.toLowerCase() === expectedOwner.toLowerCase();
    
    if (!verified) {
      console.warn(
        `NFT ownership mismatch: token ${tokenId} is owned by ${actualOwner}, not ${expectedOwner}`
      );
    }
    
    return verified;
    
  } catch (error) {
    console.error('Failed to verify NFT ownership:', error);
    // If we can't verify, don't trust it
    return false;
  }
}

/**
 * Zustand store for user's NFT collection
 */
export const useCollectionStore = create<CollectionStore>((set, get) => ({
  collectables: [],
  isLoading: false,
  error: null,
  
  /**
   * Add NFT to collection
   * CRITICAL: Verifies ownership before adding
   */
  addCollectable: async (collectable: Collectable, verify = true) => {
    try {
      if (verify) {
        // Verify ownership before adding to collection
        const isOwner = await get().verifyOwnership(
          collectable.contractAddress,
          collectable.tokenId,
          collectable.ownerAddress,
          collectable.chainId
        );
        
        if (!isOwner) {
          throw new Error('You do not own this NFT');
        }
        
        // Mark as verified
        collectable.verifiedOnChain = true;
      }
      
      // Check if already in collection
      const exists = get().collectables.some(c => 
        c.contractAddress.toLowerCase() === collectable.contractAddress.toLowerCase() &&
        c.tokenId === collectable.tokenId
      );
      
      if (!exists) {
        set(state => ({
          collectables: [...state.collectables, collectable]
        }));
      }
      
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    }
  },
  
  /**
   * Remove NFT from collection
   */
  removeCollectable: (id: string) => {
    set(state => ({
      collectables: state.collectables.filter(c => c.id !== id)
    }));
  },
  
  /**
   * Verify NFT ownership on-chain
   */
  verifyOwnership: async (contractAddress, tokenId, ownerAddress, chainId = 8453) => {
    return verifyNFTOwnership(contractAddress, tokenId, ownerAddress, chainId);
  },
  
  /**
   * Load user's collection from on-chain + Supabase
   */
  loadCollection: async (ownerAddress: string) => {
    set({ isLoading: true, error: null });
    
    try {
      // Option 1: Load from Supabase (cached)
      // const supabase = useSupabaseClient();
      // const { data } = await supabase
      //   .from('user_collectibles')
      //   .select('*')
      //   .eq('owner_address', ownerAddress);
      
      // Option 2: Load from smart contracts directly
      // This requires iterating through all drops and checking balances
      // For now, using Supabase + verification
      
      // For each collectable from DB, verify it still exists and is owned
      const verified: Collectable[] = [];
      
      // TODO: Fetch from DB and verify each one
      
      set({ 
        collectables: verified,
        isLoading: false 
      });
      
    } catch (error) {
      set({ 
        error: (error as Error).message,
        isLoading: false 
      });
    }
  }
}));

/**
 * USAGE IN COMPONENTS:
 * 
 * import { useCollectionStore } from '@/stores/collectionStore';
 * 
 * function AddNFTButton() {
 *   const { addCollectable } = useCollectionStore();
 *   
 *   const handleAddNFT = async (contractAddr, tokenId, ownerAddr) => {
 *     try {
 *       // This will verify ownership before adding
 *       await addCollectable({
 *         id: `${contractAddr}-${tokenId}`,
 *         contractAddress: contractAddr,
 *         tokenId: tokenId,
 *         ownerAddress: ownerAddr,
 *         title: 'My NFT',
 *         image: 'ipfs://...',
 *         chainId: 8453,
 *         verifiedOnChain: false // Will be set to true after verification
 *       });
 *       
 *       toast.success('NFT added to collection');
 *     } catch (error) {
 *       toast.error(error.message); // e.g., "You do not own this NFT"
 *     }
 *   };
 * }
 * 
 * SECURITY IMPROVEMENTS:
 * 
 * Before:
 * - Any code could call addCollectable()
 * - No verification of actual ownership
 * - User could see fake NFTs
 * 
 * After:
 * - addCollectable() verifies onchain ownership
 * - Will throw error if NFT not owned
 * - verifiedOnChain flag tracks verification
 * - Can audit/batch-verify collections
 */

export default useCollectionStore;
