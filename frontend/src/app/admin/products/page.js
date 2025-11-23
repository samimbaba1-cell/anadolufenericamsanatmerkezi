"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { resolveMediaUrl } from "../../../lib/images";
import { apiFetch } from "../../../lib/api";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";

const DEFAULT_FILTERS = {
  search: "",
  category: "",
  brand: "",
  status: "all",
  featured: "all",
  sort: "createdAt",
  sortDir: "desc"
};

const STATUS_OPTIONS = [
  { value: "all", label: "Durum (Tümü)" },
  { value: "active", label: "Sadece aktif" },
  { value: "inactive", label: "Pasif ürünler" }
];

const FEATURED_OPTIONS = [
  { value: "all", label: "Öne çıkarma (Tümü)" },
  { value: "featured", label: "Öne çıkarılmış" },
  { value: "not", label: "Standart ürünler" }
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "En yeni" },
  { value: "updatedAt", label: "Son güncellenen" },
  { value: "name", label: "Ada göre" },
  { value: "price", label: "Fiyata göre" },
  { value: "stock", label: "Stoka göre" }
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(Number(value) || 0);

export default function AdminProductsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const filtersRef = useRef(DEFAULT_FILTERS);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiFetch("/api/categories?all=true", { token });
      setCategories(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Admin categories load error:", err);
    }
  }, [token]);

  const loadBrands = useCallback(async () => {
    try {
      const data = await apiFetch("/api/brands?all=true", { token });
      setBrands(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Admin brands load error:", err);
    }
  }, [token]);

  const load = useCallback(
    async (page = 1, nextFilters) => {
      if (!token) return;
      const activeFilters = nextFilters || filtersRef.current;
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        if (activeFilters.search) params.set("search", activeFilters.search.trim());
        if (activeFilters.category) params.set("category", activeFilters.category);
        if (activeFilters.brand) params.set("brand", activeFilters.brand);
        if (activeFilters.status !== "all") params.set("status", activeFilters.status);
        if (activeFilters.featured !== "all") {
          params.set("featured", activeFilters.featured === "featured" ? "featured" : "not");
        }
        params.set("sort", activeFilters.sort);
        params.set("sortDir", activeFilters.sortDir);

        const data = await apiFetch(`/api/products/admin?${params.toString()}`, { token });
        const list = data.items || [];
        setItems(list);
        setPagination({
          page: data.pagination?.page || page,
          pages: data.pagination?.pages || 1,
          total: data.pagination?.total || list.length
        });
      } catch (err) {
        console.error("Admin products load error:", err);
        setError(err.message || "Ürünler yüklenirken bir hata oluştu");
        setItems([]);
        setPagination({ page: 1, pages: 1, total: 0 });
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    if (token && user?.role === "admin") {
      loadCategories();
      loadBrands();
      load(1, filtersRef.current);
    }
  }, [token, user?.role, loadCategories, loadBrands, load]);

  const handleDelete = async (id) => {
    if (!window.confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    try {
      await apiFetch(`/api/products/${id}`, { method: "DELETE", token });
      setMessage("Ürün silindi");
      load(pagination.page);
    } catch (err) {
      setError(err.message || "Ürün silinemedi");
    }
  };

  const handleFilterChange = (key, value) => {
    const next = { ...filtersRef.current, [key]: value };
    setFilters(next);
    setPagination((prev) => ({ ...prev, page: 1 }));
    load(1, next);
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setPagination((prev) => ({ ...prev, page: 1 }));
    load(1, DEFAULT_FILTERS);
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
    load(page);
  };

  const handleToggleStatus = async (product, field) => {
    const nextValue = field === "isActive" ? !product.isActive : !product.isFeatured;
    setActionLoading(product._id + field);
    setMessage("");
    setError("");
    try {
      await apiFetch(`/api/products/${product._id}/status`, {
        method: "PATCH",
        token,
        body: { [field]: nextValue }
      });
      setMessage(field === "isActive" ? "Ürün görünürlüğü güncellendi" : "Öne çıkarma durumu güncellendi");
      load(pagination.page);
    } catch (err) {
      console.error("Product status toggle error:", err);
      setError(err.message || "Durum güncellenemedi");
    } finally {
      setActionLoading(null);
    }
  };

  if (authLoading) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
    return <main className="max-w-6xl mx-auto p-6">Yetkisiz</main>;
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Ürün Yönetimi</h1>
          <p className="text-sm text-gray-500">Ürünleri görüntüle, filtrele ve hızlıca aksiyon al</p>
        </div>
        <Link href="/admin/products/new" className="inline-flex">
          <Button>+ Yeni Ürün</Button>
        </Link>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="search"
            placeholder="Ürün adı, SKU veya barkod"
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="input-modern"
          />
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="input-modern"
          >
            <option value="">Kategori (Tümü)</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={filters.brand}
            onChange={(e) => handleFilterChange("brand", e.target.value)}
            className="input-modern"
          >
            <option value="">Marka (Tümü)</option>
            {brands.map((brand) => (
              <option key={brand._id} value={brand._id}>
                {brand.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="input-modern"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            value={filters.featured}
            onChange={(e) => handleFilterChange("featured", e.target.value)}
            className="input-modern"
          >
            {FEATURED_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2">
            <select
              value={filters.sort}
              onChange={(e) => handleFilterChange("sort", e.target.value)}
              className="input-modern"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              value={filters.sortDir}
              onChange={(e) => handleFilterChange("sortDir", e.target.value)}
              className="input-modern"
            >
              <option value="desc">Azalan</option>
              <option value="asc">Artan</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            {message && <span className="text-sm text-green-600">{message}</span>}
            <button
              onClick={handleResetFilters}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Filtreleri sıfırla
            </button>
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="p-0">
        {loading ? (
          <div className="p-6">Yükleniyor...</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Seçtiğiniz kriterlere göre ürün bulunamadı.</div>
        ) : (
          <div className="divide-y">
            {items.map((p) => {
              const imageSrc = resolveMediaUrl(p.images?.[0]);
              return (
                <div
                  key={p._id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 ${
                    !p.isActive ? "bg-gray-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 overflow-hidden rounded bg-gray-100">
                      <Image
                        src={imageSrc}
                        alt={p.name || "Ürün"}
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 line-clamp-1">{p.name || "İsimsiz ürün"}</div>
                      <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                        <span>SKU: {p.sku || "-"}</span>
                        <span>Stok: {Number.isFinite(p.stock) ? p.stock : 0}</span>
                        <span>{formatCurrency(p.price)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {p.category?.name && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                            {p.category.name}
                          </span>
                        )}
                        {(p.brandRef?.name || p.brand) && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                            {p.brandRef?.name || p.brand}
                          </span>
                        )}
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            p.isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                          }`}
                        >
                          {p.isActive ? "Aktif" : "Pasif"}
                        </span>
                        {p.isFeatured && (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                            Öne çıkarıldı
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-sm sm:items-end">
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/product/${p._id}`} className="text-blue-600 hover:underline">
                        Görüntüle
                      </Link>
                      <Link href={`/admin/products/edit/${p._id}`} className="text-gray-700 hover:underline">
                        Düzenle
                      </Link>
                      <button onClick={() => handleDelete(p._id)} className="text-red-600 hover:underline">
                        Sil
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => handleToggleStatus(p, "isActive")}
                        disabled={actionLoading === p._id + "isActive"}
                        className="text-xs"
                      >
                        {actionLoading === p._id + "isActive"
                          ? "Güncelleniyor..."
                          : p.isActive
                            ? "Pasif yap"
                            : "Aktif yap"}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => handleToggleStatus(p, "isFeatured")}
                        disabled={actionLoading === p._id + "isFeatured"}
                        className="text-xs"
                      >
                        {actionLoading === p._id + "isFeatured"
                          ? "Güncelleniyor..."
                          : p.isFeatured
                            ? "Öne çıkarma kapat"
                            : "Öne çıkar"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-t">
            {Array.from({ length: pagination.pages }).map((_, i) => {
              const pageNum = i + 1;
              const isActive = pagination.page === pageNum;
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`px-3 py-1 rounded border text-sm ${
                    isActive ? "bg-gray-800 text-white" : "bg-white hover:bg-gray-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>
        )}
      </Card>
    </main>
  );
}

