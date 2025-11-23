"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function RecentOrders() {
  const { token, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const fetchOrders = async () => {
      if (!token) {
        setLoading(false);
        setError("Oturum bulunamadı.");
        return;
      }
      setLoading(true);
      setError("");

      try {
        const data = await apiFetch("/api/orders/admin?limit=5&sort=createdAt&sortDir=desc", { token });
        if (!isMounted) return;
        setOrders(Array.isArray(data?.items) ? data.items : []);
      } catch (err) {
        if (!isMounted) return;
        console.error("Recent orders fetch error:", err);
        setError(err.message || "Siparişler yüklenemedi");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (!authLoading) {
      fetchOrders();
    }

    return () => {
      isMounted = false;
    };
  }, [token, authLoading]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'shipped': return 'text-purple-600 bg-purple-100';
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Bekliyor';
      case 'processing': return 'İşleniyor';
      case 'shipped': return 'Kargoda';
      case 'delivered': return 'Teslim Edildi';
      case 'cancelled': return 'İptal Edildi';
      default: return status;
    }
  };

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
        <h2 className="text-lg font-semibold mb-2 text-red-600">Son Siparişler</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Son Siparişler</h2>
        <Link
          href="/admin/orders"
          className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
        >
          Tümünü Gör
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="text-gray-500 text-sm">Henüz sipariş yok.</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order._id} className="flex items-center justify-between p-2 border rounded">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  #{order.orderNumber || order._id?.slice(-8)}
                </p>
                <p className="text-xs text-gray-500">
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString("tr-TR") : "-"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(order.status)}`}>
                  {getStatusText(order.status)}
                </span>
                <span className="text-sm font-semibold">₺{(order.total ?? 0).toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
