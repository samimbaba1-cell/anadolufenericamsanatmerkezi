"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";

const INITIAL_ANALYTICS = {
  range: "7d",
  generatedAt: null,
  summary: {
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    revenueChange: 0,
    ordersChange: 0,
    cancellationRate: 0
  },
  customers: {
    totalCustomers: 0,
    newCustomers: 0,
    returningCustomers: 0,
    activeCustomers: 0,
    repeatRate: 0,
    customerGrowth: 0
  },
  timeline: [],
  traffic: {
    sources: [],
    paymentMethods: [],
    statuses: []
  },
  products: {
    topProducts: [],
    topCategories: []
  },
  inventory: {
    overview: {
      totalProducts: 0,
      activeProducts: 0,
      lowStockCount: 0,
      outOfStockCount: 0
    },
    lowStock: [],
    outOfStock: []
  },
  realTime: {
    activeOrders: 0,
    lastOrder: null
  },
  recentOrders: []
};

const RANGE_OPTIONS = [
  { value: "1d", label: "Son 24 Saat" },
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "90d", label: "Son 90 Gün" }
];

function formatNumber(value) {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString("tr-TR");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 2
  }).format(value || 0);
}

function formatPercent(value) {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(1)}%`;
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function DeltaBadge({ value }) {
  if (!value) return null;
  const positive = value > 0;
  const negative = value < 0;
  const label = `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
  const classes = positive
    ? "text-green-700 bg-green-100"
    : negative
      ? "text-red-700 bg-red-100"
      : "text-gray-600 bg-gray-100";

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${classes}`}>
      {label}
    </span>
  );
}

export default function AnalyticsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [analytics, setAnalytics] = useState(INITIAL_ANALYTICS);
  const [dateRange, setDateRange] = useState("7d");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch(`/api/admin/analytics?range=${dateRange}`, { token });
      setAnalytics({ ...INITIAL_ANALYTICS, ...data });
    } catch (err) {
      const message = err.message || "Analitik veriler yüklenirken hata oluştu";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [token, dateRange, showToast]);

  useEffect(() => {
    if (!authLoading) {
      loadAnalytics();
    }
  }, [authLoading, loadAnalytics]);

  const summaryCards = useMemo(() => {
    const { summary, customers: customerMetrics } = analytics;
    return [
      {
        id: "revenue",
        label: "Toplam Ciro",
        value: formatCurrency(summary.totalRevenue),
        delta: summary.revenueChange,
        helper: "Önceki döneme göre"
      },
      {
        id: "orders",
        label: "Toplam Sipariş",
        value: formatNumber(summary.totalOrders),
        delta: summary.ordersChange,
        helper: "Önceki döneme göre"
      },
      {
        id: "avgOrder",
        label: "Ortalama Sepet",
        value: formatCurrency(summary.avgOrderValue),
        helper: "Sipariş başına ortalama tutar"
      },
      {
        id: "newCustomers",
        label: "Yeni Müşteri",
        value: formatNumber(customerMetrics.newCustomers),
        delta: customerMetrics.customerGrowth,
        helper: "Müşteri artış oranı"
      },
      {
        id: "repeatRate",
        label: "Tekrar Sipariş Oranı",
        value: formatPercent(customerMetrics.repeatRate),
        helper: "Aktif müşterilerin tekrar alışveriş oranı"
      }
    ];
  }, [analytics]);

  if (authLoading) {
    return (
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <Card className="p-8 text-center text-gray-600">Analitik veriler yükleniyor...</Card>
      </main>
    );
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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Analitik Dashboard</h1>
          <p className="text-gray-600">Sipariş, müşteri ve stok performansınızı takip edin</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-modern"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button onClick={loadAnalytics} disabled={loading} variant="secondary">
            {loading ? "Yükleniyor..." : "Yenile"}
          </Button>
        </div>
      </header>

      {error && (
        <Card className="border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </Card>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <Card key={card.id} className="p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-gray-600">{card.label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</p>
              </div>
              {card.delta !== undefined && <DeltaBadge value={card.delta} />}
            </div>
            {card.helper && <p className="mt-3 text-xs text-gray-500">{card.helper}</p>}
          </Card>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="p-6 border-green-200 bg-gradient-to-r from-green-50 to-blue-50 lg:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Canlı Durum</h3>
              <p className="text-sm text-gray-600">Son 15 dakikada alınan siparişler</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-600">{analytics.realTime.activeOrders}</p>
              <p className="text-sm text-gray-600">Aktif sipariş</p>
            </div>
          </div>
          {analytics.realTime.lastOrder && (
            <div className="mt-4 rounded-lg bg-white/70 p-4 shadow-sm">
              <p className="text-sm font-medium text-gray-700">Son sipariş</p>
              <div className="mt-1 text-sm text-gray-600">
                <span className="font-semibold">#{analytics.realTime.lastOrder.orderNumber}</span> · {formatCurrency(analytics.realTime.lastOrder.total)} · {!analytics.realTime.lastOrder.status ? "-" : analytics.realTime.lastOrder.status}
              </div>
              <div className="text-xs text-gray-500">
                {formatDateTime(analytics.realTime.lastOrder.createdAt)}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Müşteri Özeti</h3>
          <div className="mt-4 space-y-3 text-sm text-gray-700">
            <SummaryRow label="Toplam müşteri" value={analytics.customers.totalCustomers} />
            <SummaryRow label="Yeni müşteri" value={analytics.customers.newCustomers} helper={formatPercent(analytics.customers.customerGrowth)} helperLabel="büyüme" />
            <SummaryRow label="Aktif müşteri" value={analytics.customers.activeCustomers} />
            <SummaryRow label="Tekrar sipariş oranı" value={formatPercent(analytics.customers.repeatRate)} />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Satış Trendleri</h3>
          {analytics.timeline.length === 0 ? (
            <EmptyState message="Seçilen dönemde sipariş bulunmuyor" />
          ) : (
            <div className="mt-4 max-h-80 overflow-y-auto">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Tarih</th>
                    <th className="px-3 py-2 text-right">Sipariş</th>
                    <th className="px-3 py-2 text-right">Gelir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.timeline.map((item) => (
                    <tr key={item.date} className="hover:bg-gray-50">
                      <td className="px-3 py-2">{item.date}</td>
                      <td className="px-3 py-2 text-right">{item.orders}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Sipariş Durumları</h3>
          {analytics.traffic.statuses.length === 0 ? (
            <EmptyState message="Veri bulunmuyor" />
          ) : (
            <BreakdownList items={analytics.traffic.statuses} />
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Trafik Kaynakları</h3>
          {analytics.traffic.sources.length === 0 ? (
            <EmptyState message="Veri bulunmuyor" />
          ) : (
            <BreakdownList items={analytics.traffic.sources} />
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Ödeme Yöntemleri</h3>
          {analytics.traffic.paymentMethods.length === 0 ? (
            <EmptyState message="Veri bulunmuyor" />
          ) : (
            <BreakdownList items={analytics.traffic.paymentMethods} />
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">En Çok Satan Ürünler</h3>
            <span className="text-xs text-gray-500">Top 10</span>
          </div>
          {analytics.products.topProducts.length === 0 ? (
            <EmptyState message="Sipariş verisi bulunmuyor" />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Ürün</th>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-right">Adet</th>
                    <th className="px-3 py-2 text-right">Gelir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.products.topProducts.map((product) => (
                    <tr key={product.productId} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{product.name}</td>
                      <td className="px-3 py-2 text-gray-500">{product.sku || "-"}</td>
                      <td className="px-3 py-2 text-right">{product.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(product.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Kategori Performansı</h3>
          {analytics.products.topCategories.length === 0 ? (
            <EmptyState message="Kategori verisi bulunmuyor" />
          ) : (
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              {analytics.products.topCategories.map((category) => (
                <div key={category.category} className="flex items-center justify-between">
                  <div className="font-medium text-gray-900">{category.category}</div>
                  <div className="text-right">
                    <div>{formatCurrency(category.revenue)}</div>
                    <div className="text-xs text-gray-500">{category.quantity} adet</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Stok Durumu</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
            <InventoryStat label="Toplam ürün" value={analytics.inventory.overview.totalProducts} />
            <InventoryStat label="Aktif ürün" value={analytics.inventory.overview.activeProducts} />
            <InventoryStat label="Düşük stok" value={analytics.inventory.overview.lowStockCount} highlight />
            <InventoryStat label="Tükenen" value={analytics.inventory.overview.outOfStockCount} highlight />
          </div>
          {analytics.inventory.lowStock.length > 0 && (
            <div className="mt-5">
              <h4 className="text-sm font-semibold text-gray-700">Düşük stoklu ürünler</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                {analytics.inventory.lowStock.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between">
                    <span>{item.name} {item.sku ? `(${item.sku})` : ""}</span>
                    <span className="font-medium text-red-600">{item.stock} / {item.minStock}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analytics.inventory.outOfStock.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-gray-700">Stokta olmayan ürünler</h4>
              <ul className="mt-2 space-y-2 text-sm text-gray-600">
                {analytics.inventory.outOfStock.map((item) => (
                  <li key={item.productId} className="flex items-center justify-between">
                    <span>{item.name} {item.sku ? `(${item.sku})` : ""}</span>
                    <span className="font-medium text-gray-500">0 adet</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900">Son Siparişler</h3>
          {analytics.recentOrders.length === 0 ? (
            <EmptyState message="Henüz sipariş alınmamış" />
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 text-left">Sipariş</th>
                    <th className="px-3 py-2 text-left">Kaynak</th>
                    <th className="px-3 py-2 text-left">Durum</th>
                    <th className="px-3 py-2 text-right">Tutar</th>
                    <th className="px-3 py-2 text-right">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {analytics.recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">#{order.orderNumber}</td>
                      <td className="px-3 py-2 text-gray-600">{order.source || "website"}</td>
                      <td className="px-3 py-2 text-gray-600">{order.status}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(order.total)}</td>
                      <td className="px-3 py-2 text-right text-gray-500">{formatDateTime(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </section>
    </main>
  );
}

function SummaryRow({ label, value, helper, helperLabel }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {helper && <p className="text-xs text-gray-500">{helperLabel ? `${helper} ${helperLabel}` : helper}</p>}
      </div>
      <p className="text-base font-semibold text-gray-900">{typeof value === "string" ? value : formatNumber(value)}</p>
    </div>
  );
}

function BreakdownList({ items }) {
  return (
    <div className="mt-4 space-y-3 text-sm text-gray-700">
      {items.map((item) => (
        <div key={item.name} className="flex items-center justify-between">
          <div>
            <p className="font-medium text-gray-900">{item.name}</p>
            <p className="text-xs text-gray-500">{formatCurrency(item.revenue)} · {item.orders} sipariş</p>
          </div>
          <span className="text-sm font-semibold text-gray-700">{formatPercent(item.percentage)}</span>
        </div>
      ))}
    </div>
  );
}

function InventoryStat({ label, value, highlight = false }) {
  return (
    <div className={`rounded-lg border px-4 py-3 ${highlight ? "border-red-200 bg-red-50 text-red-700" : "border-gray-200 bg-gray-50 text-gray-700"}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{formatNumber(value)}</p>
    </div>
  );
}

function EmptyState({ message }) {
  return <p className="py-8 text-center text-sm text-gray-500">{message}</p>;
}
