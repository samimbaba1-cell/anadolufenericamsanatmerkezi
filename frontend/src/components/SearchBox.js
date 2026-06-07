"use client";

import { useEffect, useRef, useState } from "react";
import { getPublicApiOriginForClient } from "../lib/api-base";
import { trackSearch } from "./GoogleAnalytics";
import { useLocale } from "../context/LocaleContext";

export default function SearchBox({ className = "", variant = "default" }) {
  const { paths, routes, t } = useLocale();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    timeoutRef.current = setTimeout(async () => {
      try {
        const origin = getPublicApiOriginForClient();
        const baseSlash = origin.endsWith("/") ? origin : `${origin}/`;
        const url1 = new URL("/api/products/search", baseSlash);
        url1.searchParams.set("q", q);
        url1.searchParams.set("limit", "5");
        let res = await fetch(url1.toString());
        let data = await res.json().catch(() => ({}));
        let items = Array.isArray(data.items) ? data.items : [];

        if (!res.ok || items.length === 0) {
          const url2 = new URL("/api/products", baseSlash);
          url2.searchParams.set("search", q);
          url2.searchParams.set("limit", "5");
          res = await fetch(url2.toString());
          data = await res.json().catch(() => ({}));
          items = Array.isArray(data.items) ? data.items : [];
        }

        setResults(items);
        setOpen(items.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      }
    }, 250);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [q]);

  return (
    <div className={`relative w-full min-w-0 ${className}`.trim()}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) trackSearch(q.trim());
          window.location.href = q ? paths.search(q.trim()) : routes.search;
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.placeholder")}
          className={
            variant === "large"
              ? "w-full input-modern text-base py-3.5 min-h-[48px] rounded-xl shadow-sm"
              : "w-full input-modern py-2.5 min-h-[40px]"
          }
        />
      </form>
      {open && results.length > 0 && (
        <div className="absolute z-40 mt-1 w-full bg-white border rounded shadow">
          {results.map((r) => (
            <a key={r._id} href={paths.product(r._id)} className="block px-3 py-2 hover:bg-gray-50">
              <div className="text-sm font-medium line-clamp-1">{r.name}</div>
              <div className="text-xs text-gray-600">₺{Number(r.price || 0).toFixed(2)}</div>
            </a>
          ))}
          <div className="px-3 py-2 text-xs text-gray-600 border-t">{t("common.enterToSearch")}</div>
        </div>
      )}
    </div>
  );
}
