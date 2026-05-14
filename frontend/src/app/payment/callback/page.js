"use client";

export const dynamic = "force-dynamic";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "../../../lib/api";
import { useAuth } from "../../../context/AuthContext";

function CallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const [status, setStatus] = useState("loading"); // loading | success | error

  useEffect(() => {
    let mounted = true;
    const iyzicoToken = searchParams.get("token") || searchParams.get("paymentToken");

    if (!iyzicoToken) {
      if (mounted) {
        setStatus("error");
      }
      return;
    }

    const run = async () => {
      try {
        const res = await apiFetch("/api/payments/iyzico/callback", {
          method: "POST",
          token: token || undefined,
          body: { token: iyzicoToken }
        });
        if (!mounted) return;
        const orderId = res?.orderId;
        if (orderId) {
          router.replace(`/payment/success?orderId=${orderId}`);
        } else {
          router.replace("/payment/success");
        }
      } catch (err) {
        console.error("Payment callback error:", err);
        if (mounted) {
          setStatus("error");
        }
      }
    };

    run();

    return () => {
      mounted = false;
    };
  }, [searchParams, token, router]);

  if (status === "error") {
    return (
      <main className="max-w-lg mx-auto p-6 text-center">
        <h1 className="text-xl font-semibold text-gray-900 mb-2">Ödeme sonucu alınamadı</h1>
        <p className="text-gray-600 mb-4">
          Lütfen siparişlerim sayfasından siparişinizi kontrol edin veya bizimle iletişime geçin.
        </p>
        <Link href="/orders" className="text-indigo-600 hover:underline">
          Siparişlerime git
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto p-6 text-center">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-2/3 mx-auto" />
        <p className="text-gray-600">Ödeme sonucunuz işleniyor, yönlendiriliyorsunuz...</p>
      </div>
    </main>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-lg mx-auto p-6 text-center">
          <p className="text-gray-600">Yükleniyor...</p>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
