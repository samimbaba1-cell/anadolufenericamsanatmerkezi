"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "../../../context/AuthContext";
import { apiFetch } from "../../../lib/api";

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const { token } = useAuth();
  const orderId = searchParams.get("orderId");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const fetchOrder = async () => {
      if (!orderId || !token) {
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch(`/api/orders/${orderId}`, { token });
        if (mounted) {
          setOrder(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || "Sipariş bilgileri alınamadı.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      mounted = false;
    };
  }, [orderId, token]);

  if (loading) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/2 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
          <div className="h-4 bg-gray-200 rounded w-2/5 mx-auto"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white rounded-lg border p-8 space-y-4">
          <h1 className="text-2xl font-bold text-red-600">Sipariş Bilgileri Alınamadı</h1>
          <p className="text-gray-600">{error}</p>
          <Link href="/orders" className="text-blue-600 hover:text-blue-800 underline">
            Siparişlerime Dön
          </Link>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="max-w-2xl mx-auto p-6 text-center">
        <div className="bg-white rounded-lg border p-8 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">Siparişiniz Alındı</h1>
          <p className="text-gray-600">
            Sipariş bilgileri şu anda görüntülenemiyor. Lütfen birkaç dakika sonra tekrar deneyin veya siparişlerim sayfasından kontrol edin.
          </p>
          <Link href="/orders" className="text-blue-600 hover:text-blue-800 underline">
            Siparişlerime Git
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg border p-8 space-y-6">
        <div className="flex items-center justify-center text-green-600">
          <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Siparişiniz Alındı!</h1>
          {order?.orderNumber && (
            <p className="text-sm text-gray-500">
              <strong>Sipariş No:</strong> {order.orderNumber}
            </p>
          )}
          <p className="text-gray-600">
            Sipariş detayları e-posta adresinize gönderildi. Aşağıda ödeme ve kargo bilgilerini bulabilirsiniz.
          </p>
        </div>

        {order?.paymentMethod === "bank_transfer" && order?.paymentSnapshot?.bankAccount && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 space-y-2 text-blue-900">
            <h2 className="text-lg font-semibold">Havale / EFT Bilgileri</h2>
            <p><strong>Banka:</strong> {order.paymentSnapshot.bankAccount.bankName}</p>
            <p><strong>Hesap Sahibi:</strong> {order.paymentSnapshot.bankAccount.accountName}</p>
            <p className="font-mono text-sm">
              <strong>IBAN:</strong> {order.paymentSnapshot.bankAccount.iban}
            </p>
            {order.paymentSnapshot.bankAccount.branch && <p><strong>Şube:</strong> {order.paymentSnapshot.bankAccount.branch}</p>}
            {order.paymentSnapshot.bankAccount.accountNumber && <p><strong>Hesap No:</strong> {order.paymentSnapshot.bankAccount.accountNumber}</p>}
            {order.paymentSnapshot.bankAccount.description && <p>{order.paymentSnapshot.bankAccount.description}</p>}
            <p className="text-sm text-blue-800 mt-2">
              Ödeme açıklamasına sipariş numaranızı eklemeyi unutmayın. Ödemeniz ulaştığında siparişiniz onaylanacaktır.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-700">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">Sipariş Özeti</h3>
            <p><strong>Toplam:</strong> ₺{Number(order?.total || 0).toFixed(2)}</p>
            <p><strong>Kargo Ücreti:</strong> ₺{Number(order?.shipping || 0).toFixed(2)}</p>
            {order?.shippingCompany && <p><strong>Kargo Firması:</strong> {order.shippingCompany}</p>}
            {order?.estimatedDelivery && (
              <p><strong>Tahmini Teslimat:</strong> {new Date(order.estimatedDelivery).toLocaleDateString("tr-TR")}</p>
            )}
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-gray-900">Teslimat Adresi</h3>
            {order?.shippingAddress && (
              <div className="space-y-1">
                <p>{order.shippingAddress.firstName} {order.shippingAddress.lastName}</p>
                {order.shippingAddress.company && <p>{order.shippingAddress.company}</p>}
                <p>{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
                <p>{order.shippingAddress.zipCode} {order.shippingAddress.city}/{order.shippingAddress.state}</p>
                <p>{order.shippingAddress.country}</p>
                <p>{order.shippingAddress.phone}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <Link
            href="/orders"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-center"
          >
            Siparişlerimi Görüntüle
          </Link>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 underline text-center"
          >
            Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentSuccessContent />
    </Suspense>
  );
}
