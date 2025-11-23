"use client";

export const dynamic = 'force-dynamic';
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { apiFetch } from "../../../../lib/api";
import Card from "../../../../components/ui/Card";
import Button from "../../../../components/ui/Button";
import { resolveMediaUrl } from "../../../../lib/images";

const STATUS_OPTIONS = [
  { value: "pending", label: "Beklemede" },
  { value: "confirmed", label: "Onaylandı" },
  { value: "processing", label: "Hazırlanıyor" },
  { value: "shipped", label: "Kargoya Verildi" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "İptal Edildi" },
  { value: "refunded", label: "İade Edildi" }
];

const formatCurrency = (value = 0) =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    paymentStatus: "pending",
    paymentId: "",
    paymentNote: ""
  });
  const [shippingForm, setShippingForm] = useState({
    shippingCompany: "",
    trackingNumber: "",
    estimatedDelivery: "",
    delivered: false,
    shippingNote: ""
  });
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [shippingSaving, setShippingSaving] = useState(false);

  const orderId = useMemo(() => params?.id, [params?.id]);

  const load = useCallback(async () => {
    if (!orderId || !token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/api/orders/admin/${orderId}`, { token });
      setOrder(data);
    } catch (err) {
      console.error("Admin order detail error:", err);
      const message = err.message || "Sipariş bilgileri yüklenemedi";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [orderId, token, showToast]);

  useEffect(() => {
    if (token && user?.role === "admin") {
      load();
    }
  }, [token, user?.role, load]);

  useEffect(() => {
    if (!order) return;
    setPaymentForm({
      paymentStatus: order.paymentStatus || "pending",
      paymentId: order.paymentId || "",
      paymentNote: order.paymentSnapshot?.manualNote || ""
    });
    setShippingForm({
      shippingCompany: order.shippingCompany || order.shippingConfig?.defaultShippingCompany || "",
      trackingNumber: order.trackingNumber || "",
      estimatedDelivery: order.estimatedDelivery ? order.estimatedDelivery.slice(0, 10) : "",
      delivered: Boolean(order.deliveredAt),
      shippingNote: order.shippingSnapshot?.manualNote || ""
    });
  }, [order]);

  const shippingCompanies = useMemo(() => {
    if (!order) return [];
    const list = Array.isArray(order.shippingConfig?.shippingCompanies)
      ? order.shippingConfig.shippingCompanies.filter(Boolean)
      : [];
    if (order.shippingCompany && !list.includes(order.shippingCompany)) {
      list.push(order.shippingCompany);
    }
    return list;
  }, [order]);

  const handleStatusChange = async (status) => {
    if (!orderId) return;
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await apiFetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        body: { status },
        token
      });
      setMessage("Sipariş durumu güncellendi");
      showToast("Sipariş durumu güncellendi", "success");
      load();
    } catch (err) {
      console.error("Order status update error:", err);
      const message = err.message || "Sipariş durumu güncellenemedi";
      setError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentChange = (key, value) => {
    setPaymentForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePaymentSave = async () => {
    if (!orderId) return;
    setPaymentSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        paymentStatus: paymentForm.paymentStatus,
        paymentId: paymentForm.paymentId || "",
        paymentNote: paymentForm.paymentNote || ""
      };
      const response = await apiFetch(`/api/orders/${orderId}/payment`, {
        method: "PUT",
        body: payload,
        token
      });
      if (response?.order) {
        setOrder(response.order);
      }
      const successMessage = response?.message || "Ödeme bilgileri güncellendi";
      setMessage(successMessage);
      showToast(successMessage, "success");
    } catch (err) {
      console.error("Order payment update error:", err);
      const message = err.message || "Ödeme bilgileri güncellenemedi";
      setError(message);
      showToast(message, "error");
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleShippingChange = (key, value) => {
    setShippingForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleShippingSave = async () => {
    if (!orderId) return;
    setShippingSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        shippingCompany: shippingForm.shippingCompany,
        trackingNumber: shippingForm.trackingNumber,
        estimatedDelivery: shippingForm.estimatedDelivery || null,
        delivered: shippingForm.delivered,
        shippingNote: shippingForm.shippingNote || ""
      };
      const response = await apiFetch(`/api/orders/${orderId}/shipping`, {
        method: "PUT",
        body: payload,
        token
      });
      if (response?.order) {
        setOrder(response.order);
      }
      const successMessage = response?.message || "Kargo bilgileri güncellendi";
      setMessage(successMessage);
      showToast(successMessage, "success");
    } catch (err) {
      console.error("Order shipping update error:", err);
      const message = err.message || "Kargo bilgileri güncellenemedi";
      setError(message);
      showToast(message, "error");
    } finally {
      setShippingSaving(false);
    }
  };

  if (authLoading) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
    return <main className="max-w-6xl mx-auto p-6">Yetkisiz</main>;
  }

  if (loading) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (error || !order) {
    return (
      <main className="max-w-6xl mx-auto p-6 space-y-4">
        <Button variant="secondary" onClick={() => router.push('/admin/orders')}>← Siparişlere Dön</Button>
        <Card className="p-6 text-sm text-red-600 border-red-200 bg-red-50">{error || 'Sipariş bulunamadı.'}</Card>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Sipariş Detayı #{order.orderNumber || order._id}</h1>
          <p className="text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleString('tr-TR') : '-'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => router.push('/admin/orders')}>← Siparişlere Dön</Button>
        </div>
      </div>

      {message && <div className="rounded bg-green-50 border border-green-200 text-sm text-green-700 px-4 py-2">{message}</div>}
      {error && <div className="rounded bg-red-50 border border-red-200 text-sm text-red-700 px-4 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Sipariş Bilgileri</h2>
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="input-modern max-w-xs"
              disabled={saving}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Müşteri</h3>
              <p>{order.user?.name || `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim() || 'Misafir'}</p>
              <p className="text-gray-500">{order.user?.email || '-'}</p>
              <p className="text-gray-500">{order.shippingAddress?.phone || '-'}</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Ödeme</h3>
              <p>Yöntem: {order.paymentMethod?.replace(/_/g, ' ')}</p>
              <p>Durum: {order.paymentStatus}</p>
              {order.paymentId && <p>İşlem No: {order.paymentId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Teslimat Adresi</h3>
              <div className="text-sm text-gray-700 space-y-1">
                <p>{`${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim()}</p>
                <p>{order.shippingAddress?.company}</p>
                <p>{order.shippingAddress?.address1}</p>
                {order.shippingAddress?.address2 && <p>{order.shippingAddress.address2}</p>}
                <p>{order.shippingAddress?.city} / {order.shippingAddress?.state}</p>
                <p>{order.shippingAddress?.zipCode} {order.shippingAddress?.country}</p>
                <p>{order.shippingAddress?.phone}</p>
              </div>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Fatura Adresi</h3>
              <div className="text-sm text-gray-700 space-y-1">
                {order.billingAddress?.firstName ? (
                  <>
                    <p>{`${order.billingAddress.firstName || ''} ${order.billingAddress.lastName || ''}`.trim()}</p>
                    <p>{order.billingAddress.company}</p>
                    <p>{order.billingAddress.address1}</p>
                    {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
                    <p>{order.billingAddress.city} / {order.billingAddress.state}</p>
                    <p>{order.billingAddress.zipCode} {order.billingAddress.country}</p>
                    <p>{order.billingAddress.phone}</p>
                  </>
                ) : <p className="text-gray-500">Fatura adresi belirtilmemiş.</p>}
              </div>
            </div>
          </div>

          {order.notes && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Müşteri Notu</h3>
              <p className="text-sm text-gray-600">{order.notes}</p>
            </div>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Toplamlar</h2>
            <div className="text-sm text-gray-700 space-y-1">
              <div className="flex justify-between">
                <span>Ara Toplam</span>
                <span>{formatCurrency(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Vergi</span>
                <span>{formatCurrency(order.tax)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kargo</span>
                <span>{formatCurrency(order.shipping)}</span>
              </div>
              {order.freeShippingApplied && (
                <p className="text-xs text-green-600">Bu sipariş ücretsiz kargo ile gönderildi.</p>
              )}
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>İndirim</span>
                  <span>-{formatCurrency(order.discount)}</span>
                </div>
              )}
              {order.shippingCompany && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Kargo Firması</span>
                  <span>{order.shippingCompany}</span>
                </div>
              )}
              {order.trackingNumber && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Takip Numarası</span>
                  <span>{order.trackingNumber}</span>
                </div>
              )}
              {order.estimatedDelivery && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Tahmini Teslimat</span>
                  <span>{new Date(order.estimatedDelivery).toLocaleDateString("tr-TR")}</span>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t text-lg font-semibold text-gray-900">
              <span>Genel Toplam</span>
              <span>{formatCurrency(order.total)}</span>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Ödeme Yönetimi</h2>
              <span className="text-xs text-gray-500 capitalize">{order.paymentMethod?.replace(/_/g, " ")}</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Durumu</label>
                <select
                  value={paymentForm.paymentStatus}
                  onChange={(e) => handlePaymentChange("paymentStatus", e.target.value)}
                  className="input-modern"
                  disabled={paymentSaving}
                >
                  {['pending', 'paid', 'failed', 'refunded'].map((status) => (
                    <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ödeme Referansı</label>
                <input
                  type="text"
                  value={paymentForm.paymentId}
                  onChange={(e) => handlePaymentChange("paymentId", e.target.value)}
                  className="input-modern"
                  placeholder="Ödeme / İşlem kodu"
                  disabled={paymentSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Not</label>
                <textarea
                  value={paymentForm.paymentNote}
                  onChange={(e) => handlePaymentChange("paymentNote", e.target.value)}
                  className="input-modern"
                  rows={3}
                  placeholder="Havale dekontu, manuel not vb."
                  disabled={paymentSaving}
                />
              </div>
              <Button onClick={handlePaymentSave} disabled={paymentSaving}>
                {paymentSaving ? "Kaydediliyor..." : "Ödeme Bilgilerini Kaydet"}
              </Button>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Kargo & Takip</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kargo Firması</label>
                <input
                  type="text"
                  value={shippingForm.shippingCompany}
                  onChange={(e) => handleShippingChange("shippingCompany", e.target.value)}
                  className="input-modern"
                  list="shipping-companies"
                  placeholder="Kargo firması"
                  disabled={shippingSaving}
                />
                {shippingCompanies.length > 0 && (
                  <datalist id="shipping-companies">
                    {shippingCompanies.map((company) => (
                      <option key={company} value={company} />
                    ))}
                  </datalist>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Takip Numarası</label>
                <input
                  type="text"
                  value={shippingForm.trackingNumber}
                  onChange={(e) => handleShippingChange("trackingNumber", e.target.value)}
                  className="input-modern"
                  placeholder="Takip numarası"
                  disabled={shippingSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahmini Teslimat</label>
                <input
                  type="date"
                  value={shippingForm.estimatedDelivery}
                  onChange={(e) => handleShippingChange("estimatedDelivery", e.target.value)}
                  className="input-modern"
                  disabled={shippingSaving}
                />
              </div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={shippingForm.delivered}
                  onChange={(e) => handleShippingChange("delivered", e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  disabled={shippingSaving}
                />
                <span className="text-sm text-gray-700">Teslim edildi olarak işaretle</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kargo Notu</label>
                <textarea
                  value={shippingForm.shippingNote}
                  onChange={(e) => handleShippingChange("shippingNote", e.target.value)}
                  className="input-modern"
                  rows={3}
                  placeholder="Kurye notu, teslimat bilgisi vb."
                  disabled={shippingSaving}
                />
              </div>
              <Button onClick={handleShippingSave} disabled={shippingSaving}>
                {shippingSaving ? "Kaydediliyor..." : "Kargo Bilgilerini Kaydet"}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">Sipariş Ürünleri</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Ürün</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Adet</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Birim Fiyat</th>
                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">Toplam</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items?.map((item) => (
                <tr key={item._id || item.product?._id}>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden relative">
                      <Image
                        src={resolveMediaUrl(item.product?.images?.[0], "/images/placeholder-product.jpg")}
                        alt={item.product?.name || 'Ürün'}
                        fill
                        className="object-cover"
                        sizes="48px"
                        unoptimized
                      />
                    </div>
                    <div className="flex flex-col">
                      <Link href={`/product/${item.product?._id}`} className="font-medium text-gray-900 hover:text-primary" target="_blank">
                        {item.product?.name || 'Ürün'}
                      </Link>
                      {item.product?.barcode && <span className="text-xs text-gray-500">Barkod: {item.product.barcode}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{item.product?.sku || '-'}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{item.quantity}</td>
                  <td className="px-4 py-3 text-right text-sm text-gray-700">{formatCurrency(item.price)}</td>
                  <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(item.total || item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </main>
  );
}
