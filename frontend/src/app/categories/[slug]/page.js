"use client";

import { Suspense } from "react";
import CategoriesPageContent from "../CategoriesPageContent";

/** /categories/kolyeler gibi eski slug linkleri — aynı birleşik sayfa */
export default function CategoryBySlugPage() {
  return (
    <Suspense
      fallback={
        <main className="max-w-7xl mx-auto p-6">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        </main>
      }
    >
      <CategoriesPageContent />
    </Suspense>
  );
}
