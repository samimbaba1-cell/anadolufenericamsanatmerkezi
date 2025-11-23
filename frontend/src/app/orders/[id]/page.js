"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { apiFetch } from "../../../lib/api";
import Link from "next/link";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { token } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const data = await apiFetch(`/api/orders/${id}`, { token });
        setOrder(data);
      } catch (e) {
        setError(e.message || "Sipariş alınamadı");
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
  }, [id, token]);

  if (!token) return <main className="max-w-5xl mx-auto p-6">Giriş yapmalısınız.</main>;
  if (loading) return <main className="max-w-5xl mx-auto p-6">Yükleniyor...</main>;
  if (error) return <main className="max-w-5xl mx-auto p-6 text-red-600">{error}</main>;
  if (!order) return null;

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Sipariş #{order._id}</h1>
      <div className="mb-3 text-sm text-gray-700">Durum: <span className="font-medium">{order.status}</span></div>
      <div className="space-y-3 bg-white border rounded">
        {order.items?.map((it, idx) => (
          <div key={idx} className="p-3 border-b last:border-b-0 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                {it.product?.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.product.images[0]} alt={it.product?.name||"Ürün"} className="w-full h-full object-cover" />
                ) : <span>No Image</span>}
              </div>
              <Link href={`/product/${it.product?._id || it.product}`} className="hover:underline">{it.product?.name || "Ürün"}</Link>
            </div>
            <div className="text-sm text-gray-700">{it.quantity} adet</div>
          </div>
        ))}
      </div>
      <div className="mt-4 font-semibold">Toplam: ₺{Number(order.totalPrice||0).toFixed(2)}</div>
    </main>
  );
}
