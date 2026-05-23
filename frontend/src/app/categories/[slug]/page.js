import { Suspense } from "react";
import CategoriesPageContent from "../CategoriesPageContent";
import { getApiBaseUrl } from "../../../lib/api-base";
import { getCategorySlug } from "../../../lib/categoryUrl";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const resolved = await params;
  const rawSlug = resolved?.slug ?? "";
  const site =
    process.env.NEXT_PUBLIC_SITE_URL || "https://anadolufenericamsanatmerkezi.com";

  try {
    const api = getApiBaseUrl();
    const res = await fetch(
      `${api}/api/categories?slug=${encodeURIComponent(rawSlug)}`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return { title: "Kategori bulunamadı" };
    }
    const cat = await res.json();
    const canonicalSlug = getCategorySlug(cat) || rawSlug;
    const title = cat.metaTitle || `${cat.name} | Anadolu Feneri Cam Sanat Merkezi`;
    const description =
      cat.metaDescription ||
      cat.description ||
      `${cat.name} kategorisindeki el yapımı cam ürünleri keşfedin.`;

    return {
      title,
      description,
      alternates: {
        canonical: `${site.replace(/\/$/, "")}/categories/${canonicalSlug}`
      },
      openGraph: {
        title,
        description,
        type: "website",
        url: `${site.replace(/\/$/, "")}/categories/${canonicalSlug}`
      }
    };
  } catch {
    return { title: "Kategoriler" };
  }
}

export default async function CategoryBySlugPage({ params }) {
  const resolved = await params;
  const slug = resolved?.slug ?? "";

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
      <CategoriesPageContent initialSlug={slug} />
    </Suspense>
  );
}
