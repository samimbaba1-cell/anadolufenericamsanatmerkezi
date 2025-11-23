"use client";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function AdminStats() {
  const { token, loading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      if (!token) {
        setLoading(false);
        setError("Oturum bulunamadı.");
        return;
      }
      setLoading(true);
      setError("");

      try {
        const [productsData, ordersData] = await Promise.all([
          apiFetch("/api/products?limit=1", { token }),
          apiFetch("/api/orders/admin?limit=1", { token })
        ]);

        if (!isMounted) return;

        const totalProducts = productsData?.total || 0;
        const totalOrders = ordersData?.pagination?.total || 0;
        const totalRevenue = ordersData?.summary?.totalAmount || 0;
        const pendingOrders = ordersData?.summary?.statusBreakdown?.pending || 0;

        setStats({
          totalProducts,
          totalOrders,
          totalRevenue,
          pendingOrders
        });
      } catch (err) {
        if (!isMounted) return;
        console.error("Admin stats fetch error:", err);
        setError(err.message || "İstatistikler yüklenemedi");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (!authLoading) {
      fetchStats();
    }

    return () => {
      isMounted = false;
    };
  }, [token, authLoading]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-2 text-red-600">İstatistikler yüklenemedi</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4 sm:p-6">
      <h2 className="text-lg font-semibold mb-4">İstatistikler</h2>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Toplam Ürün</span>
          <span className="font-semibold text-blue-600">{stats.totalProducts}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Toplam Sipariş</span>
          <span className="font-semibold text-green-600">{stats.totalOrders}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Toplam Gelir</span>
          <span className="font-semibold text-purple-600">₺{stats.totalRevenue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Bekleyen Sipariş</span>
          <span className="font-semibold text-orange-600">{stats.pendingOrders}</span>
        </div>
      </div>
    </div>
  );
}
