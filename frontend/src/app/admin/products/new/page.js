"use client";

export const dynamic = "force-dynamic";

import { useAuth } from "../../../../context/AuthContext";
import ProductForm from "../_components/ProductForm";

export default function AdminNewProductPage() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <main className="max-w-5xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
    return <main className="max-w-5xl mx-auto p-6">Yetkisiz.</main>;
  }

  return (
    <main className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6">
      <ProductForm mode="create" />
    </main>
  );
}

