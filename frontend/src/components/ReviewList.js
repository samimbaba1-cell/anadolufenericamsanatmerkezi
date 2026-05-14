"use client";
import { useEffect, useMemo, useState } from "react";
import { getAbsoluteApiUrl } from "../lib/api";
import StarRating from "./StarRating";

export default function ReviewList({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [rating, setRating] = useState("all");
  const [ratingStats, setRatingStats] = useState([]);

  const ratingOptions = useMemo(() => ([
    { value: "all", label: "Tüm Puanlar" },
    { value: "5", label: "5 Yıldız" },
    { value: "4", label: "4 Yıldız" },
    { value: "3", label: "3 Yıldız" },
    { value: "2", label: "2 Yıldız" },
    { value: "1", label: "1 Yıldız" }
  ]), []);

  const load = async (nextPage = 1, nextRating = rating) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("productId", productId);
      params.set("page", String(nextPage));
      params.set("limit", "10");
      if (nextRating !== "all") params.set("rating", nextRating);
      const res = await fetch(getAbsoluteApiUrl(`/api/reviews?${params.toString()}`), { cache: "no-store" });
      if (!res.ok) {
        // Soft-handle errors without throwing to console as an uncaught error
        console.warn("Reviews fetch failed:", res.status);
        setReviews([]);
        setPage(1);
        setPages(1);
        setTotal(0);
        setRatingStats([]);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setReviews(Array.isArray(data.reviews) ? data.reviews : []);
      setPage(data?.pagination?.page || 1);
      setPages(data?.pagination?.pages || 1);
      setTotal(data?.pagination?.total || 0);
      setRatingStats(Array.isArray(data?.ratingStats) ? data.ratingStats : []);
    } catch (e) {
      console.error("ReviewList load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!productId) return;
    load(1, rating);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, rating]);

  if (!productId) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Ürün Yorumları</h2>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Puan:</label>
          <select
            className="border border-slate-300 rounded-md px-2 py-1 text-sm"
            value={rating}
            onChange={(e) => setRating(e.target.value)}
          >
            {ratingOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rating distribution */}
      {ratingStats?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {ratingStats.map((r) => (
            <span key={r._id} className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
              {r._id}★: {r.count}
            </span>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-slate-600">Yükleniyor...</div>
      ) : reviews.length === 0 ? (
        <div className="text-slate-600">Henüz yorum yok.</div>
      ) : (
        <ul className="space-y-4">
          {reviews.map((rv) => (
            <li key={rv._id} className="border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarRating value={Number(rv.rating) || 0} readOnly size={18} />
                  <div className="text-sm text-slate-700">{rv.title || "Başlıksız"}</div>
                </div>
                <div className="text-xs text-slate-500">
                  {rv.user?.name || "Kullanıcı"} • {new Date(rv.createdAt).toLocaleDateString()}
                </div>
              </div>
              <p className="text-slate-800 mt-2 whitespace-pre-wrap">{rv.comment}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-slate-600">
            Sayfa {page} / {pages} • Toplam {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1, rating)}
            >
              Önceki
            </button>
            <button
              className="px-3 py-1 text-sm border rounded disabled:opacity-50"
              disabled={page >= pages || loading}
              onClick={() => load(page + 1, rating)}
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </section>
  );
}


