"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "../../../../../context/AuthContext";
import { useToast } from "../../../../../context/ToastContext";
import ProductForm from "../../_components/ProductForm";
import { apiFetch } from "../../../../../lib/api";

export default function AdminEditProductPage() {
  const params = useParams();
  const productId = params?.id;
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token || !productId) return;
    let mounted = true;
    async function loadProduct() {
      setLoading(true);
      try {
        const data = await apiFetch(`/api/products/admin/${productId}`, { token });
        if (mounted) {
          setProduct(data);
        }
      } catch (error) {
        console.error("Product load error", error);
        showToast(error.message || "Ürün bilgileri getirilemedi", "error");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadProduct();
    return () => {
      mounted = false;
    };
  }, [productId, token, showToast]);

  if (authLoading || loading) {
    return <main className="max-w-5xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
    return <main className="max-w-5xl mx-auto p-6">Yetkisiz.</main>;
  }

  if (!product) {
    return <main className="max-w-5xl mx-auto p-6">Ürün bulunamadı.</main>;
  }

  return (
    <main className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6">
      <ProductForm mode="edit" productId={productId} initialProduct={product} />
    </main>
  );
}

