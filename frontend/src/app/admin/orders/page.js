"use client";

export const dynamic = 'force-dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { apiFetch } from "../../../lib/api";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "pending", label: "Beklemede" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "processing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargoya Verildi" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal Edildi" },
  { value: "refunded", label: "İade Edildi" }
];

const PAYMENT_STATUSES = [
  { value: "", label: "Tümü" },
  { value: "pending", label: "Ödeme Bekleniyor" },
  { value: "paid", label: "Ödendi" },
  { value: "failed", label: "Başarısız" },
  { value: "refunded", label: "İade Edildi" }
];

const SOURCES = [
  { value: "", label: "Tümü" },
  { value: "website", label: "Website" },
  { value: "trendyol", label: "Trendyol" },
  { value: "hepsiburada", label: "Hepsiburada" },
  { value: "n11", label: "N11" }
];

export default function AdminOrdersPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [summary, setSummary] = useState({ totalAmount: 0, pendingAmount: 0, statusBreakdown: {} });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(null);

  const [filters, setFilters] = useState({
    search: "",
    status: "",
    paymentStatus: "",
    source: "",
    startDate: "",
    endDate: ""
  });

  const filtersRef = useRef(filters);
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  const formatCurrency = useCallback(
    (value = 0) =>
      new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 2
      }).format(Number(value) || 0),
    []
  );

  const load = useCallback(async (page = 1) => {
    if (!token || user?.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", "20");
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });
      const data = await apiFetch(`/api/orders/admin?${params.toString()}`, { token });
      const list = data.items || [];
      setOrders(list);
      setPagination({
        page: data.pagination?.page || page,
        pages: data.pagination?.pages || 1,
        total: data.pagination?.total || list.length
      });
      setSummary({
        totalAmount: data.summary?.totalAmount || 0,
        pendingAmount: data.summary?.pendingAmount || 0,
        statusBreakdown: data.summary?.statusBreakdown || {}
      });
    } catch (err) {
      console.error("Orders load error:", err);
      const message = err.message || "Siparişler alınamadı";
      setError(message);
      showToast(message, "error");
      setOrders([]);
      setPagination({ page: 1, pages: 1, total: 0 });
      setSummary({ totalAmount: 0, pendingAmount: 0, statusBreakdown: {} });
    } finally {
      setLoading(false);
    }
  }, [filters, token, user?.role, showToast]);

  useEffect(() => {
    if (token && user?.role === "admin") {
      load(1);
    }
  }, [token, user?.role, load]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      setPagination((current) => ({ ...current, page: 1 }));
      return next;
    });
  };

  const handleResetFilters = () => {
    setFilters({
      search: "",
      status: "",
      paymentStatus: "",
      source: "",
      startDate: "",
      endDate: ""
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const updateStatus = async (id, status) => {
    try {
      setActionLoading(id);
      await apiFetch(`/api/orders/${id}/status`, {
        method: 'PUT',
        body: { status },
        token
      });
      showToast("Sipariş durumu güncellendi", "success");
      load(pagination.page);
    } catch (err) {
      console.error("Order status update error:", err);
      const message = err.message || "Sipariş durumu güncellenemedi";
      setError(message);
      showToast(message, "error");
    } finally {
      setActionLoading(null);
    }
  };

  const summaryBadges = useMemo(() => {
    const entries = Object.entries(summary.statusBreakdown || {});
    if (!entries.length) return [];
    return entries
      .map(([status, count]) => ({
        status,
        label: STATUS_OPTIONS.find((opt) => opt.value === status)?.label || status,
        count
      }))
      .sort((a, b) => b.count - a.count);
  }, [summary.statusBreakdown]);

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
          <h1 className="text-2xl font-semibold">Sipariş Yönetimi</h1>
          <p className="text-sm text-gray-500">Siparişleri görüntüleyin, filtreleyin ve durumlarını yönetin</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Toplam: <strong>{pagination.total}</strong></span>
          <span>Gelir: <strong>{formatCurrency(summary.totalAmount)}</strong></span>
          {summary.pendingAmount > 0 && (
            <span>Bekleyen Ödeme: <strong>{formatCurrency(summary.pendingAmount)}</strong></span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input
            type="search"
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="input-modern"
            placeholder="Sipariş numarası / müşteri / telefon"
          />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input-modern"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filters.paymentStatus}
            onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
            className="input-modern"
          >
            {PAYMENT_STATUSES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filters.source}
            onChange={(e) => handleFilterChange('source', e.target.value)}
            className="input-modern"
          >
            {SOURCES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              className="input-modern"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              className="input-modern"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 text-xs text-gray-500 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {summaryBadges.length === 0 ? (
              <span>Filtrelenmiş sipariş özeti yok</span>
            ) : (
              summaryBadges.map((item) => (
                <span
                  key={item.status}
                  className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-700"
                >
                  {item.label}: <strong>{item.count}</strong>
                </span>
              ))
            )}
          </div>
          <Button variant="secondary" onClick={handleResetFilters}>Filtreleri Temizle</Button>
        </div>
      </Card>

      <Card className="p-0">
        {loading ? (
          <div className="p-6">Yükleniyor...</div>
        ) : orders.length === 0 ? (
          <div className="p-6 text-center text-gray-600">Seçtiğiniz kriterlere göre sipariş bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sipariş</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Müşteri</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarih</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ödeme</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kaynak</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">#{order.orderNumber || order._id}</span>
                        <div className="mt-1">
                          <select
                            value={order.status}
                            onChange={(e) => updateStatus(order._id, e.target.value)}
                            className="input-modern text-xs"
                            disabled={actionLoading === order._id}
                          >
                            {STATUS_OPTIONS.filter((opt) => opt.value).map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          {actionLoading === order._id && (
                            <span className="mt-1 block text-[11px] text-gray-500">Güncelleniyor...</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <div className="font-medium">{order.user?.name || `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 'Misafir'}</div>
                      <div className="text-xs text-gray-500">{order.user?.email || order.shippingAddress?.phone || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : '-'}</td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">{formatCurrency(order.total)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="block capitalize">{order.paymentMethod?.replace(/_/g, ' ') || '-'}</span>
                      <span className="text-xs text-gray-500">{order.paymentStatus ? PAYMENT_STATUSES.find(opt => opt.value === order.paymentStatus)?.label || order.paymentStatus : '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{order.source || 'website'}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/orders/${order._id}`} className="text-blue-600 hover:underline">Detay</Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  onClick={() => {
                    setPagination((prev) => ({ ...prev, page: pageNum }));
                    load(pageNum);
                  }}
                  className={`px-3 py-1 rounded border text-sm ${isActive ? 'bg-gray-800 text-white' : 'bg-white hover:bg-gray-50'}`}
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