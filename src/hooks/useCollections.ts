import { useState, useEffect } from "react";

const COLLECTIONS_STORAGE_KEY = "popup-user-collections";

export function useCollections() {
  const [collectedItems, setCollectedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = window.localStorage.getItem(COLLECTIONS_STORAGE_KEY);
    if (saved) {
      try {
        setCollectedItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse collections", e);
      }
    }
    setLoading(false);
  }, []);

  const collect = (productId: string) => {
    setCollectedItems((prev) => {
      const updated = prev.includes(productId) ? prev : [...prev, productId];
      window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const isCollected = (productId: string) => {
    return collectedItems.includes(productId);
  };

  const removeFromCollection = (productId: string) => {
    setCollectedItems((prev) => {
      const updated = prev.filter((id) => id !== productId);
      window.localStorage.setItem(COLLECTIONS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const clearCollections = () => {
    setCollectedItems([]);
    window.localStorage.removeItem(COLLECTIONS_STORAGE_KEY);
  };

  return {
    collectedItems,
    collect,
    isCollected,
    removeFromCollection,
    clearCollections,
    loading,
  };
}
