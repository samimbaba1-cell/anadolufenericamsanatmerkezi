"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState([]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("wishlist") : null;
    if (!stored) {
      setIds([]);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setIds(Array.isArray(parsed) ? parsed : []);
    } catch {
      setIds([]);
      try {
        localStorage.removeItem("wishlist");
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("wishlist", JSON.stringify(ids));
  }, [ids]);

  const addItem = (id) => setIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const removeItem = (id) => setIds((prev) => prev.filter((x) => x !== id));
  const toggleItem = (id) => setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearWishlist = () => setIds([]);

  const value = useMemo(
    () => ({
      ids,
      items: ids, // backwards compatibility for older consumers
      addItem,
      removeItem,
      toggleItem,
      clearWishlist,
      add: addItem,
      remove: removeItem,
      toggle: toggleItem
    }),
    [ids]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
