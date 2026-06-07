"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../lib/api";
import Link from "next/link";
import { resolveMediaUrl } from "../../lib/images";
import { useLocale } from "../../context/LocaleContext";

export default function OrdersPage() {
  const { paths, t } = useLocale();
  const { token, user } = useAuth();

  const statusLabel = (status) => {
    const map = {
      pending: t("orders.statusPending"),
      confirmed: t("orders.statusConfirmed"),
      processing: t("orders.statusProcessing"),
      shipped: t("orders.statusShipped"),
      delivered: t("orders.statusDelivered"),
      cancelled: t("orders.statusCancelled"),
      refunded: t("orders.statusRefunded")
    };
    return map[status] || status;
  };
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiFetch("/api/orders", { token });
        const list = Array.isArray(data) ? data : data.orders || [];
        setOrders(list);
      } catch (e) {
        setError(e.message || t("orders.loadError"));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (!token || !user) return <main className="max-w-5xl mx-auto p-6">Giriş yapmalısınız.</main>;
  if (loading) return <main className="max-w-5xl mx-auto p-6">Yükleniyor...</main>;
  if (error) return <main className="max-w-5xl mx-auto p-6 text-red-600">{error}</main>;

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Siparişlerim</h1>
      {orders.length === 0 ? (
        <div>Henüz siparişiniz yok.</div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div key={o._id} className="border rounded bg-white shadow-sm">
              <div className="p-3 border-b flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
                <Link href={paths.order(o._id)} className="font-medium text-blue-600 hover:underline">
                  #{o.orderNumber || o._id}
                </Link>
                <div>{t("orders.status")}: <span className="font-medium text-gray-900">{statusLabel(o.status)}</span></div>
                <div>Toplam: <span className="font-semibold text-blue-600">₺{Number(o.total ?? o.totalPrice ?? 0).toFixed(2)}</span></div>
              </div>
              <div className="p-3 divide-y">
                {o.items?.map((it, idx) => {
                  const product = it.product || {};
                  const productId = product._id || it.productId || it.product;
                  const imageSrc = resolveMediaUrl(product.images?.[0]);
                  return (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 overflow-hidden rounded border bg-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={imageSrc}
                            alt={product.name || it.name || "Ürün"}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.src = "/images/placeholder-product.jpg"; }}
                          />
                        </div>
                        {productId ? (
                          <Link href={paths.product(productId)} className="text-sm text-gray-700 hover:text-blue-600">
                            {product.name || it.name || "Ürün"}
                          </Link>
                        ) : (
                          <span className="text-sm text-gray-700">{product.name || it.name || "Ürün"}</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-700">{it.quantity} adet</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
