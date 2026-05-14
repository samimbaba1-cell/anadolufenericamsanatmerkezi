"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch, getAbsoluteApiUrl } from "../../../lib/api";

const INITIAL_REPORT = {
  range: "30d",
  generatedAt: null,
  sales: {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    growth: 0,
    previousRevenue: 0,
    timeline: [],
    marketplaces: []
  },
  products: {
    topSelling: [],
    lowStock: [],
    outOfStock: []
  },
  customers: {
    totalCustomers: 0,
    activeCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0
  }
};

export default function ReportsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30d');
  const [reports, setReports] = useState(INITIAL_REPORT);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState({ summary: false, "top-products": false });

  const loadReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/admin/reports?range=${dateRange}`, { token });
      setReports(data);
    } catch (error) {
      console.error("Reports load error:", error);
      setError(error.message || "Raporlar yüklenirken hata oluştu!");
      showToast(error.message || "Raporlar yüklenirken hata oluştu!", "error");
    }
    setLoading(false);
  }, [dateRange, token, showToast]);

  useEffect(() => {
    if (!authLoading && token) {
      loadReports();
    }
  }, [authLoading, token, loadReports]);

  const exportReport = useCallback(
    async (type) => {
      if (!token) return;
      setExporting((prev) => ({ ...prev, [type]: true }));
      try {
        const response = await fetch(
          getAbsoluteApiUrl(`/api/admin/reports/export?range=${dateRange}&type=${type}`),
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );

        let errorMessage = "Rapor dışa aktarılırken hata oluştu!";
        if (!response.ok) {
          try {
            const err = await response.json();
            if (err?.error || err?.message) {
              errorMessage = err.error || err.message;
            }
          } catch (_) {
            // ignore json parse error
          }
          throw new Error(errorMessage);
        }

        const blob = await response.blob();
        const disposition = response.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^"]+)"?/i);
        const defaultName = `rapor-${type}-${dateRange}-${new Date().toISOString().slice(0, 10)}.csv`;
        const filename = match?.[1] ? decodeURIComponent(match[1]) : defaultName;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        showToast("Rapor indirildi", "success");
      } catch (err) {
        console.error("Report export error:", err);
        showToast(err.message || "Rapor dışa aktarılırken hata oluştu!", "error");
      } finally {
        setExporting((prev) => ({ ...prev, [type]: false }));
      }
    },
    [token, dateRange, showToast]
  );

  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <Card className="p-6 text-center text-gray-500">Yükleniyor...</Card>
      </main>
    );
  }

  if (!user || user.role !== 'admin') {
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
    <main className="max-w-7xl mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Raporlar</h1>
            <p className="text-gray-600">Detaylı analiz ve raporlar</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-modern"
            >
              <option value="7d">Son 7 Gün</option>
              <option value="30d">Son 30 Gün</option>
              <option value="90d">Son 3 Ay</option>
              <option value="1y">Son 1 Yıl</option>
            </select>

            <Button
              onClick={() => exportReport('summary')}
              className="btn-primary"
              disabled={exporting.summary}
            >
              {exporting.summary ? "Hazırlanıyor..." : "Excel (CSV) İndir"}
            </Button>
          </div>
        </div>
      </div>

      {/* Sales Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Gelir</p>
              <p className="text-2xl font-bold text-gray-900">
                ₺{reports.sales.totalRevenue.toLocaleString()}
              </p>
              <p className={`text-sm ${reports.sales.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {reports.sales.growth >= 0 ? '+' : ''}
                {reports.sales.growth.toFixed(1)}%
                <span className="text-gray-500 ml-1">(Önceki dönem ₺{reports.sales.previousRevenue.toLocaleString()})</span>
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Sipariş</p>
              <p className="text-2xl font-bold text-gray-900">{reports.sales.totalOrders}</p>
              <p className="text-sm text-gray-500">Avg. {reports.sales.timeline.length ? `${(reports.sales.totalOrders / reports.sales.timeline.length).toFixed(1)} sipariş/gün` : 'Veri yok'}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Ortalama Sipariş</p>
              <p className="text-2xl font-bold text-gray-900">₺{reports.sales.averageOrderValue.toFixed(2)}</p>
              <p className="text-sm text-purple-600">
                {reports.sales.totalOrders > 0
                  ? `₺${(reports.sales.totalRevenue / reports.sales.totalOrders).toFixed(2)} ortalama`
                  : 'Veri yok'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Toplam Müşteri</p>
              <p className="text-2xl font-bold text-gray-900">{reports.customers.totalCustomers}</p>
              <p className="text-sm text-orange-600">
                {reports.customers.newCustomers} yeni · {reports.customers.returningCustomers} geri dönen
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Selling Products */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">En Çok Satan Ürünler</h2>
            <Button
              onClick={() => exportReport('top-products')}
              className="text-sm"
              disabled={exporting["top-products"]}
            >
              {exporting["top-products"] ? "Hazırlanıyor..." : "İndir"}
            </Button>
          </div>
          
          {loading ? (
            <p className="text-center text-gray-500">Yükleniyor...</p>
          ) : reports.products.topSelling.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Bu dönem için satış verisi bulunmuyor.</p>
          ) : (
            <div className="space-y-4">
              {reports.products.topSelling.map((product, index) => (
                <div key={product.productId || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-600">{product.sales} satış · ₺{product.revenue.toLocaleString()}</p>
                    {product.sku && <p className="text-xs text-gray-500">SKU: {product.sku}</p>}
                  </div>
                  <span className="text-xs text-gray-400">#{index + 1}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Stock Alerts */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Stok Uyarıları</h2>
          
          <div className="space-y-4">
            {reports.products.lowStock.length > 0 && (
              <div>
                <h3 className="font-medium text-yellow-800 mb-2">Düşük Stok</h3>
                {reports.products.lowStock.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                    <span className="text-sm text-gray-900">{product.name}</span>
                    <span className="text-sm text-yellow-600">{product.stock} adet</span>
                  </div>
                ))}
              </div>
            )}

            {reports.products.outOfStock.length > 0 && (
              <div>
                <h3 className="font-medium text-red-800 mb-2">Stokta Yok</h3>
                {reports.products.outOfStock.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <span className="text-sm text-gray-900">{product.name}</span>
                    <span className="text-sm text-red-600">0 adet</span>
                  </div>
                ))}
              </div>
            )}

            {reports.products.lowStock.length === 0 && reports.products.outOfStock.length === 0 && (
              <p className="text-gray-500 text-center py-4">Stok uyarısı bulunmuyor</p>
            )}
          </div>
        </Card>
      </div>

      {/* Marketplace and Trend Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Pazaryeri Performansı</h2>
          {loading ? (
            <p className="text-center text-gray-500">Yükleniyor...</p>
          ) : reports.sales.marketplaces.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Pazaryeri sipariş verisi bulunmuyor.</p>
          ) : (
            <div className="space-y-3">
              {reports.sales.marketplaces.map((item) => (
                <div key={item.source} className="flex items-center justify-between rounded border border-gray-100 bg-gray-50 px-4 py-3">
                  <div>
                    <p className="font-semibold capitalize text-gray-900">
                      {item.source === 'website' ? 'Web Sitesi' : item.source}
                    </p>
                    <p className="text-xs text-gray-500">{item.orders} sipariş</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">₺{item.revenue.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Gelir Trendleri</h2>
          {loading ? (
            <p className="text-center text-gray-500">Yükleniyor...</p>
          ) : reports.sales.timeline.length === 0 ? (
            <p className="text-center text-gray-500 py-6">Bu dönem için gelir verisi bulunmuyor.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <div className="grid grid-cols-3 text-xs font-medium text-gray-500 border-b border-gray-200 pb-2">
                <span>Tarih</span>
                <span className="text-right">Sipariş</span>
                <span className="text-right">Gelir</span>
              </div>
              <div className="divide-y divide-gray-100">
                {reports.sales.timeline.map((item) => (
                  <div key={item.date} className="grid grid-cols-3 py-2 text-sm text-gray-700">
                    <span>{item.date}</span>
                    <span className="text-right">{item.orders}</span>
                    <span className="text-right">₺{item.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}
    </main>
  );
}
