"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { getPublicApiOriginForClient } from "../../lib/api-base";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import { resolveMediaUrl } from "../../lib/images";
import CategoryCard from "../../components/CategoryCard";
import { findCategoryBySlug, getCategoryHref, getCategorySlug } from "../../lib/categoryUrl";
import { safeDecodeURIComponent } from "../../lib/slugify";

const AddToCartButton = dynamicImport(() => import("../../components/AddToCartButton"), {
  ssr: false,
  loading: () => <div className="text-xs text-gray-400">Yükleniyor...</div>
});

export default function CategoriesPageContent({ initialSlug = "" }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const routeParams = useParams();
  const productsSectionRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState("");
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("newest");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [applied, setApplied] = useState({ min: "", max: "" });
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [error, setError] = useState(null);

  const categoryFromQuery = searchParams.get("category") || "";
  const slugFromPath = safeDecodeURIComponent(
    String(routeParams?.slug || initialSlug || "")
  );

  useEffect(() => {
    async function loadCategories() {
      setLoadingCategories(true);
      try {
        const origin = getPublicApiOriginForClient();
        const baseSlash = origin.endsWith("/") ? origin : `${origin}/`;
        const response = await fetch(new URL("/api/categories", baseSlash).toString(), {
          cache: "no-store"
        });
        if (!response.ok) {
          setCategories([]);
          return;
        }
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : []);
        setError(null);
      } catch (err) {
        console.error("Categories load error:", err);
        setCategories([]);
        setError("Kategoriler yüklenirken bir hata oluştu");
      } finally {
        setLoadingCategories(false);
      }
    }
    loadCategories();
  }, []);

  // URL: /categories/bileklikler veya eski ?category=5 → SEO slug'a yönlendir
  useEffect(() => {
    if (loadingCategories) return;

    if (categoryFromQuery) {
      const byId = categories.find(
        (c) => String(c.id ?? c._id) === String(categoryFromQuery)
      );
      if (byId) {
        router.replace(getCategoryHref(byId), { scroll: false });
        return;
      }
      setSelected(String(categoryFromQuery));
      return;
    }

    if (slugFromPath) {
      const bySlug = findCategoryBySlug(categories, slugFromPath);
      if (bySlug) {
        const id = String(bySlug.id ?? bySlug._id ?? "");
        setSelected(id);
        const href = getCategoryHref(bySlug);
        const currentPath = `/categories/${encodeURIComponent(slugFromPath)}`;
        if (href !== currentPath && href !== `/categories/${slugFromPath}`) {
          router.replace(href, { scroll: false });
        }
      } else {
        setSelected("");
      }
      return;
    }

    setSelected("");
  }, [loadingCategories, categories, categoryFromQuery, slugFromPath, router]);

  useEffect(() => {
    if (!selected || !productsSectionRef.current) return;
    const t = setTimeout(() => {
      productsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return () => clearTimeout(t);
  }, [selected]);

  const setCategoryFilter = useCallback(
    (categoryId) => {
      const id = categoryId ? String(categoryId) : "";
      if (!id) {
        router.push("/categories");
        return;
      }
      const cat = categories.find((c) => String(c.id ?? c._id) === id);
      router.push(cat ? getCategoryHref(cat) : "/categories");
    },
    [categories, router]
  );

  const load = useCallback(
    async (page = 1) => {
      if (!selected) return;
      setLoadingProducts(true);
      try {
        const origin = getPublicApiOriginForClient();
        const baseSlash = origin.endsWith("/") ? origin : `${origin}/`;
        const url = new URL("/api/products", baseSlash);
        url.searchParams.set("limit", "24");
        url.searchParams.set("page", String(page));
        url.searchParams.set("category", selected);

        const r = await fetch(url.toString(), { cache: "no-store" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        const d = await r.json();
        let items = Array.isArray(d.items) ? d.items : [];
        if (sort === "price_asc") items = items.sort((a, b) => (a.price || 0) - (b.price || 0));
        if (sort === "price_desc") items = items.sort((a, b) => (b.price || 0) - (a.price || 0));
        setProducts(items);
        setPagination({
          page: d.page || page,
          pages: d.pages || 1,
          total: d.total || 0
        });
      } catch (err) {
        console.error("Load products error:", err);
        setProducts([]);
        setPagination({ page: 1, pages: 1, total: 0 });
      } finally {
        setLoadingProducts(false);
      }
    },
    [selected, sort]
  );

  useEffect(() => {
    if (selected) {
      load(1);
    } else {
      setProducts([]);
      setLoadingProducts(false);
    }
  }, [load, selected]);

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const min = applied.min ? parseFloat(applied.min) : null;
    const max = applied.max ? parseFloat(applied.max) : null;
    return products.filter((p) => {
      const price = Number(p.price || 0);
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      return true;
    });
  }, [products, applied]);

  const selectedCategory = categories.find((c) => String(c.id ?? c._id) === String(selected));
  const selectedImageUrl = selectedCategory
    ? resolveMediaUrl(selectedCategory.image, null)
    : null;

  if (error) {
    return (
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold mb-6">Kategoriler</h1>
        <p className="text-red-600 text-center py-12">{error}</p>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:px-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold mb-2">
          <span className="gradient-text">Kategoriler</span>
        </h1>
        <p className="text-slate-600 text-sm sm:text-base">
          Kategoriye tıklayın — ürünler hemen altta listelenir.
        </p>
      </div>

      {/* Görsel grid — her zaman */}
      <section className="mb-10">
        {loadingCategories ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat, index) => {
              const catId = String(cat.id ?? cat._id ?? "");
              return (
                <CategoryCard
                  key={cat.id ?? cat._id ?? index}
                  category={{ ...cat, productCount: cat.productCount ?? 0 }}
                  isActive={selected !== "" && catId === String(selected)}
                  compact={categories.length > 8}
                />
              );
            })}
          </div>
        )}
      </section>

      {/* Seçili kategori ürünleri */}
      {selected ? (
        <section
          ref={productsSectionRef}
          id="kategori-urunleri"
          className="scroll-mt-24 border-t border-slate-200 pt-8"
        >
          {selectedCategory && (
            <div className="mb-6 flex flex-wrap items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-white shrink-0">
                {selectedImageUrl ? (
                  <Image
                    src={selectedImageUrl}
                    alt={selectedCategory.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-primary">
                    {(selectedCategory.name || "?").charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold">{selectedCategory.name}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedCategory.productCount ?? 0} ürün
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCategoryFilter("")}
                className="text-sm text-primary hover:underline"
              >
                Tüm kategoriler
              </button>
            </div>
          )}

          <div className="mb-6 flex flex-wrap gap-3">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
              aria-label="Sıralama"
            >
              <option value="newest">En Yeni</option>
              <option value="price_asc">Fiyat Artan</option>
              <option value="price_desc">Fiyat Azalan</option>
            </select>
            <input
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min ₺"
              className="w-24 border rounded-lg px-2 py-2 text-sm"
            />
            <input
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max ₺"
              className="w-24 border rounded-lg px-2 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => setApplied({ min: minPrice, max: maxPrice })}
              className="px-4 py-2 border rounded-lg text-sm bg-white hover:bg-slate-50"
            >
              Uygula
            </button>
          </div>

          {loadingProducts ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : filtered.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filtered.map((p) => {
                  const productId = p.id || p._id;
                  if (!productId) return null;
                  const imageSrc = resolveMediaUrl(
                    p.images?.[0],
                    "/images/placeholder-product.jpg"
                  );
                  return (
                    <Link
                      key={productId}
                      href={`/product/${productId}`}
                      className="group border rounded-lg bg-white overflow-hidden hover:shadow-md"
                    >
                      <div className="relative aspect-square bg-gray-100">
                        <Image
                          src={imageSrc}
                          alt={p.name || "Ürün"}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-sm line-clamp-2">{p.name}</p>
                        <p className="font-semibold mt-1">₺{Number(p.price || 0).toFixed(2)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
              {pagination.pages > 1 && (
                <nav className="flex justify-center gap-2 mt-8">
                  {Array.from({ length: pagination.pages }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => load(i + 1)}
                      className={`px-3 py-1 rounded border text-sm ${
                        pagination.page === i + 1 ? "bg-gray-800 text-white" : "bg-white"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              )}
            </>
          ) : (
            <p className="text-center py-12 text-gray-500">
              Bu kategoride henüz ürün yok. Admin panelinden ürün ekleyip kategoriye atayın.
            </p>
          )}
        </section>
      ) : (
        !loadingCategories && (
          <p className="text-center text-slate-500 text-sm py-6 border-t border-dashed">
            Ürünleri görmek için yukarıdan bir kategori seçin.
          </p>
        )
      )}
    </main>
  );
}
