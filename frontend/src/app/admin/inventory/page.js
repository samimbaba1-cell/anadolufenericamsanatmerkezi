"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { Suspense } from "react";
import { useAuth } from "../../../context/AuthContext";
import InventoryManager from "../../../components/InventoryManager";

export default function InventoryPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

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
    <main className="max-w-7xl mx-auto p-4 sm:p-6">
      <Suspense fallback={<div>Yükleniyor...</div>}>
        <InventoryManager />
      </Suspense>
    </main>
  );
}
