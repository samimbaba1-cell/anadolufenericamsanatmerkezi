"use client";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../lib/api";
import StarRating from "./StarRating";

export default function ReviewForm({ productId, onSubmitted }) {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <section className="mt-8">
        <h3 className="text-lg font-semibold">Yorum Yaz</h3>
        <p className="text-slate-600 mt-2">Yorum yazmak için lütfen giriş yapın.</p>
      </section>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) return;
    if (!comment || comment.trim().length < 10) {
      showToast?.("Lütfen en az 10 karakterlik bir yorum yazın.", "error");
      return;
    }
    setLoading(true);
    try {
      await apiFetch("/api/reviews", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: {
          productId,
          rating: Number(rating),
          title: title?.trim() || undefined,
          comment: comment.trim()
        }
      });
      showToast?.("Yorumunuz alındı, onaydan sonra yayınlanacaktır.", "success");
      setRating(5);
      setTitle("");
      setComment("");
      onSubmitted?.();
    } catch (e) {
      console.error("Review submit error:", e);
      showToast?.(e?.message || "Yorum gönderilemedi", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-8">
      <h3 className="text-lg font-semibold">Yorum Yaz</h3>
      <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-700">Puan</label>
          <StarRating value={Number(rating)} onChange={(v) => setRating(Number(v))} />
          <span className="text-sm text-slate-600 ml-1">{Number(rating)} / 5</span>
        </div>
        <input
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          placeholder="Başlık (opsiyonel)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
        />
        <textarea
          className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          placeholder="Yorumunuz (en az 10 karakter)"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={1000}
        />
        <div>
          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
          >
            {loading ? "Gönderiliyor..." : "Gönder"}
          </button>
        </div>
      </form>
    </section>
  );
}


