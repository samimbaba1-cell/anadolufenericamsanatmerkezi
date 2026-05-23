"use client";

import { Suspense } from "react";
import CategoriesPageContent from "../CategoriesPageContent";

export default function CategoryBySlugPage({ params }) {
  const slug = params?.slug ?? "";
  return (
    <Suspense
      fallback={
        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="animate-pulse h-8 w-48 bg-gray-200 rounded mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-xl" />
            ))}
          </div>
        </main>
      }
    >
      <CategoriesPageContent slugFilter={slug} />
    </Suspense>
  );
}
