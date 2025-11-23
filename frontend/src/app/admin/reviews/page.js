"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";

const STATUS_FILTERS = [
  { value: "all", label: "Tümü" },
  { value: "pending", label: "Bekleyen" },
  { value: "approved", label: "Onaylanan" },
  { value: "rejected", label: "Reddedilen" }
];

const RATING_OPTIONS = [
  { value: "all", label: "Tüm Puanlar" },
  { value: "5", label: "5 Yıldız" },
  { value: "4", label: "4 Yıldız" },
  { value: "3", label: "3 Yıldız" },
  { value: "2", label: "2 Yıldız" },
  { value: "1", label: "1 Yıldız" }
];

const DEFAULT_STATS = {
  statusCounts: { pending: 0, approved: 0, rejected: 0 },
  ratingDistribution: []
};

export default function ReviewsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: "all",
    rating: "all",
    productId: "",
    search: "",
    startDate: "",
    endDate: ""
  });
  const [searchDraft, setSearchDraft] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("approve");
  const [bulkLoading, setBulkLoading] = useState(false);

  const loadReviews = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.rating !== "all") params.set("rating", filters.rating);
      if (filters.productId) params.set("productId", filters.productId);
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);
      params.set("page", String(pagination.page));
      params.set("limit", "20");
      const res = await apiFetch(`/api/reviews/admin?${params.toString()}`, { token });
      setReviews(res.items || []);
      setPagination(res.pagination || { page: 1, pages: 1, total: 0 });
      setStats(res.stats || DEFAULT_STATS);
      setSelectedIds([]);
    } catch (error) {
      console.error("Reviews load error", error);
      showToast(error.message || "Yorumlar yüklenirken hata oluştu!", "error");
    } finally {
      setLoading(false);
    }
  }, [token, filters, pagination.page, showToast]);

  useEffect(() => {
    if (!authLoading && token) {
      loadReviews();
    }
  }, [authLoading, token, loadReviews]);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    try {
      const params = new URLSearchParams({
        limit: "200",
        sortBy: "name",
        sortDir: "asc",
        status: "active"
      });
      const res = await apiFetch(`/api/products/admin?${params.toString()}`, { token });
      setProducts(res.items || res?.products || []);
    } catch (error) {
      console.error("Product list error", error);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && user?.role === "admin") {
      loadProducts();
    }
  }, [authLoading, user?.role, loadProducts]);

  const updateReviewStatus = async (reviewId, status) => {
    try {
      const res = await apiFetch(`/api/reviews/${reviewId}/status`, {
        method: "PUT",
        token,
        body: { status }
      });
      const updated = res.review;
      setReviews((prev) => prev.map((review) => (review._id === reviewId ? { ...review, status: updated.status } : review)));
      await loadReviews();
      showToast("Yorum durumu güncellendi!", "success");
    } catch (error) {
      console.error("Review update error", error);
      showToast(error.message || "Güncelleme hatası!", "error");
    }
  };

  const deleteReview = async (reviewId) => {
    if (!window.confirm("Bu yorumu silmek istediğinize emin misiniz?")) return;
    try {
      await apiFetch(`/api/reviews/admin/${reviewId}`, { method: "DELETE", token });
      setReviews((prev) => prev.filter((review) => review._id !== reviewId));
      setSelectedIds((prev) => prev.filter((id) => id !== reviewId));
      showToast("Yorum silindi!", "success");
    } catch (error) {
      console.error("Review delete error", error);
      showToast(error.message || "Silme hatası!", "error");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleDateFilterChange = (key, value) => {
    handleFilterChange(key, value);
    loadReviews();
  };

  const handleSearch = () => {
    handleFilterChange("search", searchDraft);
  };

  const resetFilters = () => {
    setFilters({
      status: "all",
      rating: "all",
      productId: "",
      search: "",
      startDate: "",
      endDate: ""
    });
    setSearchDraft("");
    setPagination({ page: 1, pages: 1, total: 0 });
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(reviews.map((review) => review._id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id, checked) => {
    setSelectedIds((prev) => {
      if (checked) {
        return prev.includes(id) ? prev : [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const handleBulkAction = async () => {
    if (!selectedIds.length) {
      showToast("İşlem için yorum seçin", "warning");
      return;
    }
    setBulkLoading(true);
    try {
      await apiFetch("/api/reviews/admin/bulk", {
        method: "POST",
        token,
        body: {
          action: bulkAction,
          reviewIds: selectedIds
        }
      });
      showToast("Toplu işlem tamamlandı", "success");
      await loadReviews();
    } catch (error) {
      console.error("Bulk review action error", error);
      showToast(error.message || "Toplu işlem sırasında hata oluştu", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const filteredReviews = reviews;
  const totalSelected = selectedIds.length;
  const allSelected = reviews.length > 0 && totalSelected === reviews.length;
  const statusSummary = useMemo(() => stats.statusCounts || DEFAULT_STATS.statusCounts, [stats]);

  if (authLoading || (loading && !reviews.length)) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-700">Bu sayfa yalnızca adminler içindir.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Yorum Yönetimi</h1>
          <p className="text-gray-600">Yorumları onaylayın, filtreleyin ve toplu işlemler uygulayın.</p>
        </div>
        <Button variant="secondary" onClick={loadReviews} disabled={loading}>
          {loading ? "Yenileniyor..." : "Yenile"}
        </Button>
      </div>

      <Card className="p-4 flex flex-wrap items-center gap-3">
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.value}
            onClick={() => handleFilterChange("status", item.value)}
            className={`rounded px-4 py-2 text-sm font-medium transition-colors ${
              filters.status === item.value ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {item.label}
            {item.value !== "all" && (
              <span className="ml-2 inline-flex h-5 items-center rounded bg-white px-2 text-xs font-semibold text-gray-600">
                {statusSummary[item.value] || 0}
              </span>
            )}
          </button>
        ))}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {["pending", "approved", "rejected"].map((key) => (
          <Card key={key} className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              {key === "pending" ? "Bekleyen" : key === "approved" ? "Onaylanan" : "Reddedilen"}
            </p>
            <p className="mt-2 text-2xl font-semibold text-gray-900">{statusSummary[key] || 0}</p>
          </Card>
        ))}
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Ürün</label>
            <select
              className="input-modern"
              value={filters.productId}
              onChange={(e) => handleFilterChange("productId", e.target.value)}
            >
              <option value="">Tüm ürünler</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Puan</label>
            <select
              className="input-modern"
              value={filters.rating}
              onChange={(e) => handleFilterChange("rating", e.target.value)}
            >
              {RATING_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Arama</label>
            <div className="flex items-center gap-2">
              <input
                type="search"
                className="input-modern flex-1"
                placeholder="Yorum metni ara..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={loading}>
                Ara
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tarih Aralığı</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="input-modern"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
              <input
                type="date"
                className="input-modern"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setFilters((prev) => ({ ...prev, startDate: "", endDate: "" }))}>
            Tarihi temizle
          </Button>
          <Button variant="secondary" onClick={resetFilters}>
            Tüm filtreleri temizle
          </Button>
        </div>
      </Card>

      {stats.ratingDistribution?.length > 0 && (
        <Card className="p-4 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">Puan Dağılımı</h2>
          <div className="space-y-2">
            {stats.ratingDistribution.map((item) => (
              <div key={item.rating} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="w-12 font-semibold">{item.rating} ★</span>
                <div className="flex-1 rounded-full bg-gray-100">
                  <div
                    className="rounded-full bg-yellow-400 py-1"
                    style={{
                      width: `${Math.min(100, (item.count / (pagination.total || 1)) * 100)}%`
                    }}
                  />
                </div>
                <span className="w-10 text-right text-gray-600">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {reviews.length > 0 && (
        <Card className="flex flex-wrap items-center gap-4 p-4 text-sm text-gray-700">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={allSelected}
              onChange={(e) => handleSelectAll(e.target.checked)}
            />
            <span>{totalSelected} yorum seçildi</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              className="input-modern w-44"
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="approve">Onayla</option>
              <option value="reject">Reddet</option>
              <option value="delete">Sil</option>
            </select>
            <Button onClick={handleBulkAction} disabled={bulkLoading || !totalSelected}>
              {bulkLoading ? "İşleniyor..." : "Toplu Uygula"}
            </Button>
          </div>
        </Card>
      )}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Toplam {pagination.total} yorum</span>
          <div className="flex gap-1">
            {Array.from({ length: pagination.pages }).map((_, idx) => {
              const pageNumber = idx + 1;
              const active = pageNumber === pagination.page;
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`rounded px-3 py-1 ${active ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Yorumlar yükleniyor...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Yorum Bulunamadı</h3>
            <p className="text-gray-600">Seçilen filtreye uygun yorum bulunmuyor.</p>
          </Card>
        ) : (
          filteredReviews.map((review) => (
            <Card key={review._id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="pt-1">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedIds.includes(review._id)}
                    onChange={(e) => handleSelectOne(review._id, e.target.checked)}
                  />
                </div>
                <div className="flex-1">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                      {review.user?.name?.charAt(0).toUpperCase() || "?"}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{review.user?.name || "Anonim"}</h3>
                      <p className="text-sm text-gray-500">{review.user?.email || "-"}</p>
                    </div>
                  </div>

                  <div className="mb-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Ürün:</span>
                      <span className="text-blue-600">{review.product?.name || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium text-gray-700">Puan:</span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <svg key={i} className={`h-4 w-4 ${i < review.rating ? "text-yellow-400" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        ))}
                        <span className="ml-2 text-sm text-gray-600">({review.rating}/5)</span>
                      </div>
                    </div>
                    <p className="text-gray-700">{review.comment}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{new Date(review.createdAt).toLocaleDateString('tr-TR')}</span>
                      <span className={`rounded-full px-2 py-1 font-medium ${
                        review.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : review.status === "pending"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {review.status === "approved" ? "Onaylandı" : review.status === "pending" ? "Bekliyor" : "Reddedildi"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {review.status === "pending" && (
                    <>
                      <Button onClick={() => updateReviewStatus(review._id, "approved")} className="btn-primary px-3 py-1 text-sm">
                        Onayla
                      </Button>
                      <Button onClick={() => updateReviewStatus(review._id, "rejected")} className="bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                        Reddet
                      </Button>
                    </>
                  )}
                  {review.status === "approved" && (
                    <Button onClick={() => updateReviewStatus(review._id, "rejected")} className="bg-red-600 px-3 py-1 text-sm text-white hover:bg-red-700">
                      Reddet
                    </Button>
                  )}
                  {review.status === "rejected" && (
                    <Button onClick={() => updateReviewStatus(review._id, "approved")} className="btn-primary px-3 py-1 text-sm">
                      Onayla
                    </Button>
                  )}
                  <Button onClick={() => deleteReview(review._id)} className="bg-gray-600 px-3 py-1 text-sm text-white hover:bg-gray-700">
                    Sil
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </main>
  );
}
