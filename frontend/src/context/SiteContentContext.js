"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchSiteContent,
  invalidateSiteContentCache,
  mergeSiteContent
} from "../lib/siteContent";

const defaultContent = mergeSiteContent({});

const SiteContentContext = createContext({
  content: defaultContent,
  loading: true,
  error: null,
  refetch: async () => {}
});

export function SiteContentProvider({ children }) {
  const [content, setContent] = useState(defaultContent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const hasLoadedRef = useRef(false);

  const refetch = useCallback(async (force = false) => {
    if (force) invalidateSiteContentCache();
    setError(null);
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const data = await fetchSiteContent({ force });
      setContent(mergeSiteContent(data));
      hasLoadedRef.current = true;
    } catch (err) {
      console.error("[SiteContent] load failed:", err);
      setError(err?.message || "İçerik yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({ content, loading, error, refetch }),
    [content, loading, error, refetch]
  );

  return <SiteContentContext.Provider value={value}>{children}</SiteContentContext.Provider>;
}

export function useSiteContent() {
  return useContext(SiteContentContext);
}
