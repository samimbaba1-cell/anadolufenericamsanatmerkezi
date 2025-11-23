"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import NextDynamic from "next/dynamic";
import Link from "next/link";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import Button from "../../components/ui/Button";
import Card from "../../components/ui/Card";
import { apiFetch } from "../../lib/api";

const LegacyAdminStats = NextDynamic(() => import("../../components/AdminStats"), {
  ssr: false,
  loading: () => (
    <Card className="p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="h-3 bg-gray-200 rounded"></div>
          <div className="h-3 bg-gray-200 rounded"></div>
        </div>
      </div>
    </Card>
  )
});

const RANGE_OPTIONS = [
  { value: "7d", label: "Son 7 Gün" },
  { value: "30d", label: "Son 30 Gün" },
  { value: "90d", label: "Son 90 Gün" },
  { value: "1y", label: "Son 12 Ay" }
];

const statusLabels = {
  pending: "Bekliyor",
  confirmed: "Onaylandı",
  processing: "Hazırlanıyor",
  shipped: "Kargoda",
  delivered: "Teslim Edildi",
  cancelled: "İptal",
  refunded: "İade"
};

const statusStyles = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  refunded: "bg-orange-100 text-orange-700"
};

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0
});

export default function AdminPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/dashboard?range=${range}`, { token });
      setDashboard(data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      showToast(error.message || "Dashboard verileri yüklenemedi", "error");
    } finally {
      setLoading(false);
    }
  }, [token, range, showToast]);

  useEffect(() => {
    if (!authLoading) {
      fetchDashboard();
    }
  }, [authLoading, fetchDashboard]);

  const handleRefresh = async () => {
    if (!token) return;
    setRefreshing(true);
    try {
      const data = await apiFetch(`/api/admin/dashboard?range=${range}`, { token });
      setDashboard(data);
      showToast("Dashboard güncellendi", "success");
    } catch (error) {
      console.error("Dashboard refresh error:", error);
      showToast(error.message || "Dashboard yenilenemedi", "error");
    } finally {
      setRefreshing(false);
    }
  };

  const metrics = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        label: "Toplam Gelir",
        value: dashboard.sales?.totalRevenue || 0,
        change: dashboard.sales?.growth ?? 0,
        type: "currency"
      },
      {
        label: "Toplam Sipariş",
        value: dashboard.sales?.totalOrders || 0,
        subLabel: `Bugün ${dashboard.orders?.todayOrders || 0}`
      },
      {
        label: "Ortalama Sepet",
        value: dashboard.sales?.averageOrderValue || 0,
        type: "currency"
      },
      {
        label: "Yeni Müşteriler",
        value: dashboard.customers?.newCustomers || 0,
        subLabel: `Bugün +${dashboard.customers?.newCustomersToday || 0}`
      }
    ];
  }, [dashboard]);

  const timeline = dashboard?.sales?.timeline || [];
  const timelineMax = timeline.reduce((max, item) => Math.max(max, item.revenue), 0) || 1;
  const recentOrders = dashboard?.recentOrders || [];

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
    <main className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">Admin Paneli</h1>
          <p className="text-gray-600">E-ticaret sitenizi yönetin ve büyütün</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value)}
            className="input-modern w-40"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <Button variant="secondary" onClick={handleRefresh} disabled={refreshing} loading={refreshing}>
            Yenile
          </Button>
        </div>
      </div>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-lg border bg-white p-4">
                <p className="text-sm text-gray-600">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">
                  {metric.type === "currency"
                    ? currencyFormatter.format(metric.value || 0)
                    : metric.value?.toLocaleString("tr-TR")}
                </p>
                {metric.change !== undefined && (
                  <p
                    className={`text-sm ${
                      metric.change >= 0 ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {metric.change >= 0 ? "+" : ""}
                    {metric.change.toFixed(1)}%
                  </p>
                )}
                {metric.subLabel && <p className="text-xs text-gray-500 mt-1">{metric.subLabel}</p>}
              </div>
            ))}
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <div className="rounded-lg border bg-white p-4">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Gelir Trendleri</h2>
                    <p className="text-sm text-gray-600">Seçilen aralıktaki günlük gelir</p>
                  </div>
                  <span className="text-sm text-gray-500">{timeline.length} gün</span>
                </div>
                {timeline.length === 0 ? (
                  <p className="text-sm text-gray-500">Grafikte gösterilecek veri bulunamadı.</p>
                ) : (
                  <div className="flex h-48 items-end gap-2">
                    {timeline.map((item) => (
                      <div key={item.date} className="flex flex-1 flex-col items-center">
                        <div
                          className="w-full rounded-t bg-blue-500 transition-all"
                          style={{ height: `${Math.max((item.revenue / timelineMax) * 100, 6)}%` }}
                          title={`${item.date} - ${currencyFormatter.format(item.revenue)}`}
                        />
                        <span className="mt-2 text-xs text-gray-500">
                          {new Date(item.date).toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-lg border bg-white p-4">
                <h2 className="text-lg font-semibold mb-4">Sipariş Durumları</h2>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                  {Object.entries(dashboard?.orders?.status || {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border border-dashed p-3">
                      <p className="text-sm text-gray-500">{statusLabels[key] || key}</p>
                      <p className="text-xl font-semibold text-gray-900">
                        {value.count?.toLocaleString("tr-TR") || 0}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <InfoBadge label="Bugünkü Sipariş" value={dashboard?.orders?.todayOrders || 0} />
                  <InfoBadge label="Hazırlanacak" value={dashboard?.orders?.pendingFulfillment || 0} />
                  <InfoBadge label="Ödeme Bekleyen" value={dashboard?.orders?.pendingPayments || 0} />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <LegacyAdminStats />
              <div className="rounded-lg border bg-white p-4">
                <h2 className="text-lg font-semibold mb-4">Müşteri İçgörüleri</h2>
                <MetricRow label="Toplam Müşteri" value={dashboard?.customers?.totalCustomers} />
                <MetricRow label="Aktif Müşteri" value={dashboard?.customers?.activeCustomers} />
                <MetricRow label="Geri Dönen" value={dashboard?.customers?.returningCustomers} />
              </div>

              <div className="rounded-lg border bg-white p-4">
                <h2 className="text-lg font-semibold mb-4">Pazaryeri Performansı</h2>
                {dashboard?.marketplaces?.length ? (
                  <div className="space-y-3 text-sm">
                    {dashboard.marketplaces.map((marketplace) => (
                      <div key={marketplace.source || "website"}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-700">
                            {marketplace.source === "website" ? "Website" : marketplace.source}
                          </span>
                          <span className="text-gray-900">
                            {currencyFormatter.format(marketplace.revenue || 0)}
                          </span>
                        </div>
                        <div className="mt-1 h-2 rounded-full bg-gray-100">
                          <div
                            className="h-2 rounded-full bg-blue-500"
                            style={{
                              width: `${Math.min(
                                (marketplace.revenue / (dashboard.sales?.totalRevenue || 1)) * 100,
                                100
                              )}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">Henüz pazaryeri verisi bulunmuyor.</p>
                )}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="rounded-lg border bg-white p-4 lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Son Siparişler</h2>
                <Link href="/admin/orders" className="text-sm text-blue-600 hover:text-blue-800">
                  Tümünü Gör
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz sipariş yok.</p>
              ) : (
                <div className="space-y-2">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="grid gap-3 rounded border p-3 sm:grid-cols-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{order.orderNumber}</p>
                        <p className="text-xs text-gray-500">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString("tr-TR") : "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">{order.customer?.name || "Misafir"}</p>
                        <p className="text-xs text-gray-500">{order.customer?.email || "-"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${
                            statusStyles[order.status] || "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {statusLabels[order.status] || order.status}
                        </span>
                        <span className="text-xs text-gray-500">{order.source}</span>
                      </div>
                      <div className="text-sm font-semibold text-right text-gray-900">
                        {currencyFormatter.format(order.total || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border bg-white p-4">
              <h2 className="text-lg font-semibold mb-4">Stok Uyarıları</h2>
              <div className="mb-4 text-sm text-gray-600">
                <p>Aktif Ürün: {dashboard?.inventory?.totalActive?.toLocaleString("tr-TR") || 0}</p>
                <p>Düşük Stok: {dashboard?.inventory?.lowStockCount?.toLocaleString("tr-TR") || 0}</p>
                <p>Tükenmiş: {dashboard?.inventory?.outOfStockCount?.toLocaleString("tr-TR") || 0}</p>
              </div>
              <div className="space-y-3">
                {(dashboard?.inventory?.lowStock || []).map((product) => (
                  <div key={product.productId} className="rounded border border-dashed p-3 text-sm">
                    <p className="font-medium text-gray-900">
                      {product.name}{" "}
                      <span className="text-xs text-gray-500">
                        ({product.stock} / {product.minStock})
                      </span>
                    </p>
                  </div>
                ))}
                {(dashboard?.inventory?.lowStock || []).length === 0 && (
                  <p className="text-sm text-gray-500">Kritik stok uyarısı yok.</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border bg-white p-4">
            <h2 className="text-lg font-semibold mb-4">Hızlı Erişim</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center rounded-lg border p-3 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className={`mr-3 flex h-10 w-10 items-center justify-center rounded-lg ${link.bg}`}>
                    <link.icon className={`h-5 w-5 ${link.color}`} />
                  </div>
                  <div>
                    <h3 className="font-medium">{link.title}</h3>
                    <p className="text-sm text-gray-600">{link.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, idx) => (
          <div key={idx} className="rounded-lg border bg-white p-4">
            <div className="h-4 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-8 w-1/2 animate-pulse rounded bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="h-64 rounded-lg border bg-white p-4">
        <div className="h-full w-full animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

function InfoBadge({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-sm">
      <p className="text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value?.toLocaleString("tr-TR") || 0}</p>
    </div>
  );
}

function MetricRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-semibold text-gray-900">{value?.toLocaleString("tr-TR") || 0}</span>
    </div>
  );
}

const baseQuickLinks = [
  {
    href: "/admin/products",
    title: "Ürün Yönetimi",
    subtitle: "Ürünleri ekle, düzenle, sil",
    bg: "bg-blue-100",
    color: "text-blue-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4v10l8 4 8-4V7z" />
      </svg>
    )
  },
  {
    href: "/admin/orders",
    title: "Siparişler",
    subtitle: "Durumları takip et",
    bg: "bg-green-100",
    color: "text-green-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l2-8H5.4M7 13L5.4 5M7 13l-2 9m12-9l2 9m-6-9v9" />
      </svg>
    )
  },
  {
    href: "/admin/inventory",
    title: "Envanter",
    subtitle: "Stok takibi",
    bg: "bg-indigo-100",
    color: "text-indigo-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V7a2 2 0 00-2-2H6a2 2 0 00-2 2v6" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 13h16l1 6H3l1-6z" />
      </svg>
    )
  },
  {
    href: "/admin/reports",
    title: "Raporlar",
    subtitle: "Detaylı analizler",
    bg: "bg-purple-100",
    color: "text-purple-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17V9m4 8V5m4 12V3M7 21V13M3 21v-4" />
      </svg>
    )
  },
  {
    href: "/admin/settings",
    title: "Site Ayarları",
    subtitle: "Genel yapılandırma",
    bg: "bg-slate-100",
    color: "text-slate-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
];

const quickLinks = [
  ...baseQuickLinks,
  {
    href: "/admin/categories",
    title: "Kategori Yönetimi",
    subtitle: "Kategorileri düzenle",
    bg: "bg-orange-100",
    color: "text-orange-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" />
      </svg>
    )
  },
  {
    href: "/admin/brands",
    title: "Ürün Markaları",
    subtitle: "Markaları oluştur/düzenle",
    bg: "bg-indigo-100",
    color: "text-indigo-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-2.21 0-4 1.79-4 4v6h8v-6c0-2.21-1.79-4-4-4z"
        />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12H6a4 4 0 00-4 4v2h4m10-6h2a4 4 0 014 4v2h-4" />
      </svg>
    )
  },
  {
    href: "/admin/coupons",
    title: "Kupon Yönetimi",
    subtitle: "İndirim ve promosyonlar",
    bg: "bg-amber-100",
    color: "text-amber-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 7l5 5-5 5V7zm14 0v10l-5-5 5-5z" />
      </svg>
    )
  },
  {
    href: "/admin/banners",
    title: "Banner Yönetimi",
    subtitle: "Hero ve promosyon alanları",
    bg: "bg-pink-100",
    color: "text-pink-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h10M4 18h10" />
      </svg>
    )
  },
  {
    href: "/admin/reviews",
    title: "Yorum Yönetimi",
    subtitle: "Ürün yorumlarını moderasyon",
    bg: "bg-yellow-100",
    color: "text-yellow-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  {
    href: "/admin/branding",
    title: "Kurumsal Kimlik",
    subtitle: "Logo ve kimlik ayarları",
    bg: "bg-rose-100",
    color: "text-rose-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3v6h6v-6c0-1.657-1.343-3-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 10h.01M18 10h.01M12 4V2m6.364 4.364l1.414-1.414M4.222 4.222l1.414 1.414" />
      </svg>
    )
  },
  {
    href: "/admin/theme",
    title: "Tema Yönetimi",
    subtitle: "Renk ve font ayarları",
    bg: "bg-purple-100",
    color: "text-purple-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    )
  },
  {
    href: "/admin/design",
    title: "Tasarım Stüdyosu",
    subtitle: "Gelişmiş tasarım",
    bg: "bg-teal-100",
    color: "text-teal-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5h2M5 7h14M5 11h14M7 15h10M9 19h6" />
      </svg>
    )
  },
  {
    href: "/admin/content",
    title: "İçerik Yönetimi",
    subtitle: "Sayfa içerikleri",
    bg: "bg-yellow-100",
    color: "text-yellow-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12h10M7 16h6m3 4H8a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    href: "/admin/marketplaces",
    title: "Pazaryeri Entegrasyonları",
    subtitle: "Trend, Hepsiburada feed",
    bg: "bg-sky-100",
    color: "text-sky-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a3 3 0 00-3-3H4m12 5v-2a3 3 0 013-3h2M7 9V7a3 3 0 013-3h4a3 3 0 013 3v2" />
      </svg>
    )
  },
  {
    href: "/admin/media",
    title: "Medya Galerisi",
    subtitle: "Dosya yükle ve yönet",
    bg: "bg-cyan-100",
    color: "text-cyan-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4-4a2 2 0 012.828 0L16 17M4 6h16v12H4z" />
      </svg>
    )
  },
  {
    href: "/admin/seo",
    title: "SEO Yönetimi",
    subtitle: "Meta ve arama ayarları",
    bg: "bg-lime-100",
    color: "text-lime-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3v6h6v-6c0-1.343-1.343-3-3-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 10h.01M18 10h.01M12 4V2m6.364 4.364l1.414-1.414M4.222 4.222l1.414 1.414" />
      </svg>
    )
  },
  {
    href: "/admin/users",
    title: "Kullanıcı Yönetimi",
    subtitle: "Roller ve izinler",
    bg: "bg-gray-100",
    color: "text-gray-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5h10z" />
      </svg>
    )
  },
  {
    href: "/admin/analytics",
    title: "Analitik Dashboard",
    subtitle: "Performans raporları",
    bg: "bg-fuchsia-100",
    color: "text-fuchsia-600",
    icon: (props) => (
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 12h2M6 20V10a2 2 0 012-2h8a2 2 0 012 2v10M6 20H4m2 0h12m0 0h2" />
      </svg>
    )
  }
];


