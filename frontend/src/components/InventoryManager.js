"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { apiFetch } from "../lib/api";
import { resolveMediaUrl } from "../lib/images";

const PAGE_LIMIT = 20;

/** API Mongo/Sequelize karışımı: benzersiz key ve API yolları için */
function entityId(entity) {
  if (!entity) return null;
  return entity.id ?? entity._id ?? null;
}

const statusConfig = {
  out: {
    label: "Stok Yok",
    badge: "bg-red-100 text-red-700",
    bg: "bg-red-50"
  },
  low: {
    label: "Düşük Stok",
    badge: "bg-yellow-100 text-yellow-700",
    bg: "bg-yellow-50"
  },
  ok: {
    label: "Stokta",
    badge: "bg-green-100 text-green-700",
    bg: "bg-green-50"
  }
};

const BULK_ACTIONS = [
  {
    value: "setStock",
    label: "Stoku belirli değere ayarla",
    requiresValue: true,
    placeholder: "Örn: 100",
    minZero: true
  },
  {
    value: "adjustStock",
    label: "Stoku bu kadar artır/azalt",
    requiresValue: true,
    placeholder: "± Değer",
    minZero: false
  },
  {
    value: "setMinStock",
    label: "Minimum stoku ayarla",
    requiresValue: true,
    placeholder: "Örn: 15",
    minZero: true
  },
  {
    value: "markActive",
    label: "Seçili ürünleri aktif yap",
    requiresValue: false
  },
  {
    value: "markInactive",
    label: "Seçili ürünleri pasif yap",
    requiresValue: false
  }
];

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value || 0);
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("tr-TR");
}

export default function InventoryManager() {
  const { token } = useAuth();
  const { show } = useToast();
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", category: "", status: "all", lowStock: false, outOfStock: false });
  const [sort, setSort] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [editingProduct, setEditingProduct] = useState(null);
  const [stockUpdate, setStockUpdate] = useState({ stock: "0", minStock: "0", note: "" });
  const [updating, setUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAction, setBulkAction] = useState(BULK_ACTIONS[0].value);
  const [bulkValue, setBulkValue] = useState("");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const loadStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const data = await apiFetch("/api/admin/inventory/stats", { token });
      setStats(data);
    } catch (err) {
      console.error("Inventory stats error", err);
    } finally {
      setStatsLoading(false);
    }
  }, [token]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiFetch("/api/categories?all=true", { token });
      setCategories(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Kategori yükleme hatası", err);
    }
  }, [token]);

  const loadProducts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(PAGE_LIMIT));
      params.set("sort", sort);
      params.set("sortDir", sortDir);
      if (filters.search) params.set("search", filters.search);
      if (filters.category) params.set("category", filters.category);
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.lowStock) params.set("lowStock", "true");
      if (filters.outOfStock) params.set("outOfStock", "true");

      const data = await apiFetch(`/api/admin/inventory/products?${params.toString()}`, { token });
      setProducts(data.items || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      console.error("Inventory list error", err);
      setError(err.message || "Ürünler yüklenemedi");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [token, filters, pagination.page, sort, sortDir]);

  useEffect(() => {
    if (!token) return;
    loadCategories();
    loadStats();
  }, [token, loadCategories, loadStats]);

  useEffect(() => {
    if (!token) return;
    loadProducts();
  }, [token, loadProducts]);

  const loadHistory = useCallback(async (productId) => {
    if (!token || !productId) return;
    setHistory([]);
    setHistoryError("");
    setHistoryLoading(true);
    try {
      const data = await apiFetch(`/api/admin/inventory/products/${productId}/history`, { token });
      setHistory(data.history || []);
    } catch (err) {
      console.error("Inventory history error", err);
      setHistoryError(err.message || "Geçmiş kayıtlar yüklenemedi");
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => products.some((product) => entityId(product) === id)));
  }, [products]);

  const handleFilterChange = (key, value) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const toggleFilter = (key) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
    setSelectedIds([]);
  };

  const startEditing = (product) => {
    setEditingProduct(product);
    setStockUpdate({
      stock: String(product.stock ?? 0),
      minStock: String(product.minStock ?? 0),
      note: ""
    });
    loadHistory(entityId(product));
  };

  const cancelEditing = () => {
    setEditingProduct(null);
    setStockUpdate({ stock: "0", minStock: "0", note: "" });
    setHistory([]);
    setHistoryError("");
  };

  const handleStockUpdate = async () => {
    if (!editingProduct) return;
    const nextStock = Number(stockUpdate.stock);
    const nextMinStock = Number(stockUpdate.minStock);

    if (!Number.isFinite(nextStock) || nextStock < 0) {
      show("Geçerli bir stok değeri girin", "error");
      return;
    }

    if (!Number.isFinite(nextMinStock) || nextMinStock < 0) {
      show("Geçerli bir minimum stok değeri girin", "error");
      return;
    }

    setUpdating(true);
    try {
      await apiFetch(`/api/admin/inventory/products/${entityId(editingProduct)}`, {
        method: "PATCH",
        token,
        body: {
          stock: Math.max(0, Math.floor(nextStock)),
          minStock: Math.max(0, Math.floor(nextMinStock)),
          note: stockUpdate.note
        }
      });
      show("Stok bilgisi güncellendi", "success");
      cancelEditing();
      loadProducts();
      loadStats();
    } catch (err) {
      console.error("Stock update error", err);
      show(err.message || "Stok güncellenemedi", "error");
    } finally {
      setUpdating(false);
    }
  };

  const resetFilters = () => {
    setFilters({ search: "", category: "", status: "all", lowStock: false, outOfStock: false });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const toggleSelect = (productId) => {
    setSelectedIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (!visibleIds.length) return;
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleExport = () => {
    const exportItems = hasSelection
      ? products.filter((product) => selectedIds.includes(entityId(product)))
      : products;

    if (exportItems.length === 0) {
      show("İndirilecek ürün bulunamadı", "error");
      return;
    }

    const headers = [
      "Ürün Adı",
      "SKU",
      "Barkod",
      "Stok",
      "Minimum Stok",
      "Durum",
      "Fiyat",
      "Kategori",
      "Stok Değeri",
      "Son Güncelleme"
    ];

    const rows = exportItems.map((item) => {
      const status = statusConfig[item.stockStatus] || statusConfig.ok;
      return [
        item.name,
        item.sku || "",
        item.barcode || "",
        item.stock ?? 0,
        item.minStock ?? 0,
        status.label,
        item.price ?? 0,
        item.category?.name || "",
        item.inventoryValue ?? 0,
        formatDate(item.stockUpdatedAt)
      ];
    });

    const serializeCell = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const csvContent = [headers, ...rows].map((row) => row.map(serializeCell).join(";")).join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `envanter-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleBulkApply = async () => {
    if (!hasSelection) {
      show("Toplu işlem için en az bir ürün seçin", "error");
      return;
    }

    const actionMap = {
      setStock: "set-stock",
      adjustStock: "adjust-stock",
      setMinStock: "set-min-stock",
      markActive: "toggle-active",
      markInactive: "toggle-active"
    };

    const apiAction = actionMap[bulkAction];
    if (!apiAction) {
      show("Geçersiz işlem", "error");
      return;
    }

    const payload = {
      productIds: selectedIds,
      action: apiAction,
      note: bulkNote ? bulkNote.trim() : undefined
    };

    if (selectedActionConfig.requiresValue) {
      const numericValue = Number(bulkValue);
      if (!Number.isFinite(numericValue)) {
        show("Lütfen geçerli bir sayı girin", "error");
        return;
      }
      payload.value = selectedActionConfig.minZero ? Math.max(0, numericValue) : numericValue;
    } else if (bulkAction === "markActive") {
      payload.value = true;
    } else if (bulkAction === "markInactive") {
      payload.value = false;
    }

    setBulkLoading(true);
    try {
      const response = await apiFetch("/api/admin/inventory/bulk", {
        method: "POST",
        token,
        body: payload
      });
      show(response?.message || "Toplu işlem tamamlandı", "success");
      setSelectedIds([]);
      setBulkNote("");
      if (selectedActionConfig.requiresValue) {
        setBulkValue("");
      }
      loadProducts();
      loadStats();
    } catch (err) {
      console.error("Inventory bulk error", err);
      show(err.message || "Toplu işlem gerçekleştirilemedi", "error");
    } finally {
      setBulkLoading(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: "Toplam Ürün",
        value: stats.totalProducts,
        accent: "bg-indigo-100 text-indigo-700",
        helper: "Kaydedilmiş ürün"
      },
      {
        title: "Aktif Ürün",
        value: stats.activeProducts,
        accent: "bg-blue-100 text-blue-700",
        helper: "Satışa açık ürün"
      },
      {
        title: "Toplam Stok",
        value: stats.totalStockQuantity,
        accent: "bg-emerald-100 text-emerald-700",
        helper: "Adet"
      },
      {
        title: "Envanter Değeri",
        value: formatCurrency(stats.totalInventoryValue),
        accent: "bg-purple-100 text-purple-700",
        helper: "TRY"
      },
      {
        title: "Düşük Stok",
        value: stats.lowStockCount,
        accent: "bg-yellow-100 text-yellow-700",
        helper: "Min stok altında"
      },
      {
        title: "Stok Yok",
        value: stats.outOfStockCount,
        accent: "bg-red-100 text-red-700",
        helper: "0 adet kalan"
      }
    ];
  }, [stats]);

  const visibleIds = useMemo(
    () => products.map((product) => entityId(product)).filter((id) => id != null),
    [products]
  );
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
  const hasSelection = selectedIds.length > 0;
  const selectedActionConfig = useMemo(
    () => BULK_ACTIONS.find((item) => item.value === bulkAction) || BULK_ACTIONS[0],
    [bulkAction]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Envanter Yönetimi</h1>
          <p className="text-sm text-gray-500">Stok durumlarını izleyin ve hızlıca güncelleyin</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { loadProducts(); loadStats(); setSelectedIds([]); }}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Yenile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsLoading && !stats
          ? [...Array(4)].map((_, idx) => (
              <div key={idx} className="rounded-lg border bg-white p-4 animate-pulse h-24" />
            ))
          : summaryCards.slice(0, 4).map((card) => (
              <div key={card.title} className="rounded-lg border bg-white p-4">
                <div className="text-sm text-gray-500">{card.title}</div>
                <div className="mt-2 text-2xl font-semibold">
                  {typeof card.value === "number" ? card.value.toLocaleString("tr-TR") : card.value}
                </div>
                <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${card.accent}`}>
                  {card.helper || "Güncel"}
                </div>
              </div>
            ))}
      </div>
      {summaryCards.length > 4 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.slice(4).map((card) => (
            <div key={card.title} className="rounded-lg border bg-white p-4">
              <div className="text-sm text-gray-500">{card.title}</div>
              <div className="mt-2 text-2xl font-semibold">
                {typeof card.value === "number" ? card.value.toLocaleString("tr-TR") : card.value}
              </div>
              <div className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${card.accent}`}>
                {card.helper || "Güncel"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Ürün adı / SKU / Barkod"
            className="input-modern"
          />
          <select
            value={filters.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="input-modern"
          >
            <option value="">Kategori (Tümü)</option>
            {categories.map((cat, idx) => (
              <option key={entityId(cat) ?? `cat-${idx}`} value={entityId(cat) ?? ""}>
                {cat.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input-modern"
          >
            <option value="all">Durum (Tümü)</option>
            <option value="active">Aktif ürünler</option>
            <option value="inactive">Pasif ürünler</option>
          </select>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={() => toggleFilter('lowStock')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Düşük stok
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filters.outOfStock}
                onChange={() => toggleFilter('outOfStock')}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Stok yok
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="input-modern"
            >
              <option value="name">Ada göre</option>
              <option value="stock">Stok</option>
              <option value="minStock">Min stok</option>
              <option value="price">Fiyat</option>
              <option value="stockUpdatedAt">Güncelleme</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value)}
              className="input-modern"
            >
              <option value="asc">Artan</option>
              <option value="desc">Azalan</option>
            </select>
          </div>
          <button
            onClick={resetFilters}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Filtreleri temizle
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">
              {hasSelection ? `${selectedIds.length} ürün seçildi` : "Henüz ürün seçmediniz"}
            </p>
            <p className="text-xs text-gray-500">
              Toplu işlemler sadece seçili ürünlerde uygulanır. CSV indirirken seçim yoksa mevcut liste indirilir.
            </p>
          </div>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="input-modern min-w-[180px]"
              >
                {BULK_ACTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {selectedActionConfig.requiresValue && (
                <input
                  type="number"
                  value={bulkValue}
                  onChange={(e) => setBulkValue(e.target.value)}
                  className="input-modern w-full sm:w-32"
                  placeholder={selectedActionConfig.placeholder}
                />
              )}
            </div>
            <input
              type="text"
              value={bulkNote}
              onChange={(e) => setBulkNote(e.target.value)}
              className="input-modern"
              placeholder="Not (opsiyonel)"
              maxLength={300}
            />
            <div className="flex gap-2">
              <button
                onClick={handleBulkApply}
                disabled={!hasSelection || bulkLoading}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {bulkLoading ? "İşleniyor..." : "Toplu uygula"}
              </button>
              <button
                onClick={handleExport}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                CSV indir
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={visibleIds.length > 0 && allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Tümünü seç"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ürün</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU / Barkod</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Stok</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Fiyat</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Stok Değeri</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Son Güncelleme</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">Veriler yükleniyor...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-500">Ürün bulunamadı.</td>
                </tr>
              ) : (
                products.map((product, rowIdx) => {
                  const pid = entityId(product);
                  const status = statusConfig[product.stockStatus] || statusConfig.ok;
                  const imageSrc = resolveMediaUrl(product.images?.[0] || product.image, "/images/placeholder-product.jpg");
                  return (
                    <tr key={pid ?? `inv-row-${rowIdx}`} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          checked={pid != null && selectedIds.includes(pid)}
                          onChange={() => pid != null && toggleSelect(pid)}
                          aria-label={`${product.name} seç`}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-lg border bg-gray-100">
                            <Image
                              src={imageSrc}
                              alt={product.name || "Ürün görseli"}
                              fill
                              sizes="48px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-500">{product.category?.name || "Kategori yok"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        <div>SKU: {product.sku || '-'}</div>
                        <div>Barkod: {product.barcode || '-'}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div className="font-semibold text-gray-900">{product.stock ?? 0}</div>
                        <div className="text-xs text-gray-500">Min: {product.minStock ?? 0}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${status.badge}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-700">{formatCurrency(product.price)}</td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900">{formatCurrency(product.inventoryValue)}</td>
                      <td className="px-4 py-4 text-sm text-gray-500">{formatDate(product.stockUpdatedAt)}</td>
                      <td className="px-4 py-4 text-right text-sm">
                        <button
                          onClick={() => startEditing(product)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Düzenle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-gray-600">
            <div>Toplam {pagination.total} kayıt</div>
            <div className="flex items-center gap-1">
              {Array.from({ length: pagination.pages }).map((_, idx) => {
                const pageNumber = idx + 1;
                const active = pageNumber === pagination.page;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`rounded-md px-3 py-1 text-sm ${active ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {stats && (stats.recentUpdates?.length > 0 || stats.criticalCategories?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stats.recentUpdates?.length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Son güncellenen ürünler</h2>
              <div className="space-y-2">
                {stats.recentUpdates.map((item, uidx) => (
                  <div
                    key={entityId(item) ?? `${item.sku ?? "upd"}-${uidx}`}
                    className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      <div className="text-xs text-gray-500">SKU: {item.sku || '-'} • {formatDate(item.stockUpdatedAt)}</div>
                    </div>
                    <div className="text-sm text-gray-700">{item.stock} / {item.minStock ?? 0}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.criticalCategories?.length > 0 && (
            <div className="rounded-lg border bg-white p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Dikkat Gerektiren Kategoriler</h2>
              <div className="space-y-2">
                {stats.criticalCategories.map((item, cidx) => (
                  <div
                    key={item.categoryId ?? item.categoryName ?? `crit-${cidx}`}
                    className="flex items-center justify-between rounded-md border border-gray-100 px-3 py-2"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.categoryName}</div>
                      <div className="text-xs text-gray-500">Toplam stok: {item.totalStock}</div>
                    </div>
                    <div className="text-sm text-red-600">Düşük stok: {item.lowStock}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {editingProduct && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Stok güncelle – {editingProduct.name}</h2>
            <p className="text-sm text-gray-500 mb-4">SKU: {editingProduct.sku || '-'} • Barkod: {editingProduct.barcode || '-'}</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mevcut stok</label>
                <input
                  type="number"
                  min={0}
                  value={stockUpdate.stock}
                  onChange={(e) => setStockUpdate((prev) => ({ ...prev, stock: e.target.value }))}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum stok</label>
                <input
                  type="number"
                  min={0}
                  value={stockUpdate.minStock}
                  onChange={(e) => setStockUpdate((prev) => ({ ...prev, minStock: e.target.value }))}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Not (opsiyonel)</label>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={stockUpdate.note}
                  onChange={(e) => setStockUpdate((prev) => ({ ...prev, note: e.target.value }))}
                  className="input-modern"
                  placeholder="Güncelleme notu bırakabilirsiniz"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Stok geçmişi</label>
                  {historyLoading && <span className="text-xs text-gray-500">Yükleniyor...</span>}
                </div>
                {historyError && (
                  <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {historyError}
                  </div>
                )}
                {!historyLoading && !historyError && history.length === 0 && (
                  <p className="text-xs text-gray-500">Bu ürün için kayıt bulunamadı.</p>
                )}
                {!historyLoading && history.length > 0 && (
                  <div className="max-h-40 overflow-y-auto rounded border border-gray-100">
                    <ul className="divide-y divide-gray-100 text-xs text-gray-700">
                      {history.map((entry, idx) => (
                        <li key={`${entry.updatedAt}-${idx}`} className="px-3 py-2 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-gray-900">{entry.quantity} stk • min {entry.minStock}</span>
                            <span className="text-gray-500">{formatDate(entry.updatedAt)}</span>
                          </div>
                          {entry.note && <p className="text-gray-600">{entry.note}</p>}
                          {entry.updatedBy && (
                            <p className="text-gray-500">
                              {entry.updatedBy.name || entry.updatedBy.email || "Admin"}
                            </p>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={cancelEditing}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                disabled={updating}
              >
                İptal
              </button>
              <button
                onClick={handleStockUpdate}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
                disabled={updating}
              >
                {updating ? 'Güncelleniyor...' : 'Güncelle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
