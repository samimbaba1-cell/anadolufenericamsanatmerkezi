"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { apiFetch, getMediaUploadUrl } from "../../lib/api";
import { resolveMediaUrl } from "../../lib/images";
import Button from "../ui/Button";

/**
 * Medya kütüphanesinden görsel seçme veya bilgisayardan yükleme.
 * URL yazdırmak yerine dosya seç / galeriden seç akışı.
 */
export default function MediaPicker({
  label = "Görsel",
  value = "",
  onChange,
  accept = "image/*",
  hint,
  className = "",
}) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const fileRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadLibrary = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const q = new URLSearchParams({
        page: "1",
        limit: "48",
        sort: "createdAt",
        sortDir: "desc",
        type: "image",
      });
      if (search.trim()) q.set("search", search.trim());
      const data = await apiFetch(`/api/media?${q}`, { token });
      const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setItems(list);
    } catch (err) {
      showToast(err.message || "Medya yüklenemedi", "error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, search, showToast]);

  useEffect(() => {
    if (!open) return;
    loadLibrary();
  }, [open, loadLibrary]);

  const uploadFiles = async (files) => {
    if (!files?.length || !token) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      const res = await fetch(getMediaUploadUrl(), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error("Yükleme başarısız");
      const data = await res.json();
      const url = data?.files?.[0]?.url;
      if (!url) throw new Error("Geçersiz yükleme yanıtı");
      onChange?.(url);
      showToast("Görsel yüklendi", "success");
      setOpen(false);
      await loadLibrary();
    } catch (err) {
      showToast(err.message || "Görsel yüklenemedi", "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const modal = open ? (
    <div
      className="fixed inset-0 z-[10000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Medya seç"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">Görsel seç</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Kapat"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-4 py-3">
          <input
            ref={fileRef}
            type="file"
            accept={accept}
            className="sr-only"
            onChange={(e) => uploadFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? "Yükleniyor…" : "Bilgisayardan yükle"}
          </Button>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                loadLibrary();
              }
            }}
            placeholder="Medya ara…"
            className="input-modern min-w-[140px] flex-1"
          />
          <Button type="button" variant="ghost" onClick={loadLibrary}>
            Ara
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-sm text-gray-500 py-8">Yükleniyor…</p>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-8">
              Henüz görsel yok. Bilgisayardan yükleyin veya Medya sayfasına gidin.
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {items.map((item, idx) => {
                const url = item.url || item.path;
                const id = item.id ?? item._id ?? idx;
                const selected = value && url === value;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      onChange?.(url);
                      setOpen(false);
                    }}
                    className={`relative aspect-square overflow-hidden rounded-lg border-2 transition ${
                      selected ? "border-primary ring-2 ring-primary/30" : "border-gray-200 hover:border-primary"
                    }`}
                  >
                    <Image
                      src={resolveMediaUrl(url, "/images/placeholder-product.jpg")}
                      alt={item.originalName || "Medya"}
                      fill
                      className="object-cover"
                      sizes="120px"
                      unoptimized
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className={`space-y-2 ${className}`}>
      {label ? <span className="block text-sm font-medium text-gray-700">{label}</span> : null}

      <div className="flex flex-wrap items-start gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-white">
          {value ? (
            <Image
              src={resolveMediaUrl(value, "/images/placeholder-product.jpg")}
              alt="Önizleme"
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">Yok</div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
              Galeriden seç
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              Dosya yükle
            </Button>
            {value ? (
              <button
                type="button"
                className="text-sm text-red-600 hover:underline"
                onClick={() => onChange?.("")}
              >
                Kaldır
              </button>
            ) : null}
          </div>
          {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => uploadFiles(e.target.files)}
      />

      {mounted && modal ? createPortal(modal, document.body) : null}
    </div>
  );
}
