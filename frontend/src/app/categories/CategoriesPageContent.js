"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { getPublicApiOriginForClient } from "../../lib/api-base";
import Link from "next/link";
import dynamicImport from "next/dynamic";
import { useSearchParams, useRouter } from "next/navigation";
import { resolveMediaUrl } from "../../lib/images";
import CategoryCard from "../../components/CategoryCard";
import { getCategoryHref } from "../../lib/categoryUrl";

const AddToCartButton = dynamicImport(() => import("../../components/AddToCartButton"), {
  ssr: false,
  loading: () => <div className="text-xs text-gray-400">Yükleniyor...</div>
});

export default function CategoriesPageContent({ slugFilter = null }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const productsSectionRef = useRef(null);

  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState("");
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("newest");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [applied, setApplied] = useState({ min: "", max: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categoryFromQuery = searchParams.get("category") || "";

  useEffect(() => {
    async function loadCategories() {
      try {
        const origin = getPublicApiOriginForClient();
        const baseSlash = origin.endsWith("/") ? origin : `${origin}/`;
        const response = await fetch(new URL("/api/categories", baseSlash).toString());
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
        setLoading(false);
      }
    }
    loadCategories();
  }, []);

  useEffect(() => {
    if (!categories.length) {
      if (categoryFromQuery) setSelected(categoryFromQuery);
      return;
    }

    if (slugFilter) {
      const bySlug = categories.find((c) => c.slug === slugFilter);
      if (bySlug) {
        setSelected(String(bySlug.id ?? bySlug._id ?? ""));
        return;
      }
    }

    if (categoryFromQuery) {
      setSelected(categoryFromQuery);
      return;
    }

    if (!slugFilter) {
      setSelected("");
    }
  }, [categories, categoryFromQuery, slugFilter]);

  useEffect(() => {
    if (selected && productsSectionRef.current) {
      const t = setTimeout(() => {
        productsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [selected]);

  const setCategoryFilter = useCallback(
    (categoryId) => {
      const id = categoryId ? String(categoryId) : "";
      setSelected(id);
      if (!id) {
        router.push("/categories", { scroll: false });
        return;
      }
      const cat = categories.find((c) => String(c.id ?? c._id) === id);
      if (cat?.slug) {
        router.push(getCategoryHref(cat), { scroll: false });
      } else {
        router.push(`/categories?category=${id}`, { scroll: false });
      }
    },
    [categories, router]
  );

  const load = useCallback(
    async (page = 1) => {
      if (!selected) return;
      setLoading(true);
      try {
        const origin = getPublicApiOriginForClient();
        const baseSlash = origin.endsWith("/") ? origin : `${origin}/`;
        const url = new URL("/api/products", baseSlash);
        url.searchParams.set("limit", "24");
        url.searchParams.set("page", String(page));
        url.searchParams.set("category", selected);

        const r = await fetch(url.toString());
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
        setLoading(false);
      }
    },
    [selected, sort]
  );

  useEffect(() => {
    if (selected) {
      load(1);
    } else {
      setProducts([]);
    }
  }, [load, selected]);

  const filtered = useMemo(() => {
    if (!Array.isArray(products)) return [];
    const min = applied.min ? parseFloat(applied.min) : null;
    const max = applied.max ? parseFloat(applied.max) : null;
    return products.filter((p) => {
      if (!p) return false;
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
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">Kategoriler</h1>
        <div className="text-center py-12 text-red-600">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            type="button"
          >
            Tekrar Dene
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:px-8">
      {/* Başlık */}
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
          <span className="gradient-text">Kategoriler</span>
        </h1>
        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto">
          Bir kategoriye tıklayın; ürünler aşağıda listelenir.
        </p>
      </div>

      {/* Görsel kategori grid — her zaman görünür */}
      <section aria-label="Kategori listesi" className="mb-10 sm:mb-12">
        {loading && categories.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-56 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : categories.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {categories.map((cat, index) => {
              const catId = String(cat.id ?? cat._id ?? "");
              return (
                <CategoryCard
                  key={cat.id || cat._id || index}
                  category={{ ...cat, productCount: cat.productCount ?? 0 }}
                  isActive={selected && catId === String(selected)}
                  compact={categories.length > 8}
                />
              );
            })}
          </div>
        ) : (
          <p className="text-center py-12 text-gray-500">
            Henüz kategori eklenmemiş.
          </p>
        )}
      </section>

      {/* Seçili kategori + ürünler */}
      {selected ? (
        <section
          id="kategori-urunleri"
          ref={productsSectionRef}
          className="scroll-mt-24 border-t border-slate-200 pt-8 sm:pt-10"
          aria-label="Kategori ürünleri"
        >
          {selectedCategory && (
            <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="relative w-full sm:w-28 h-28 rounded-xl overflow-hidden bg-white shrink-0">
                {selectedImageUrl ? (
                  <Image
                    src={selectedImageUrl}
                    alt={selectedCategory.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/20">
                    <span className="text-3xl font-bold text-primary">
                      {(selectedCategory.name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  {selectedCategory.name}
                </h2>
                {selectedCategory.description && (
                  <p className="text-slate-600 text-sm mt-1">{selectedCategory.description}</p>
                )}
                <p className="text-sm text-slate-500 mt-2">
                  {selectedCategory.productCount ?? 0} ürün
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCategoryFilter("")}
                className="shrink-0 text-sm text-primary hover:underline whitespace-nowrap"
              >
                Tümünü göster
              </button>
            </div>
          )}

          <div className="mb-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <label htmlFor="sort-select" className="sr-only">
              Sıralama
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="newest">En Yeni</option>
              <option value="price_asc">Fiyat Artan</option>
              <option value="price_desc">Fiyat Azalan</option>
            </select>
            <div className="flex items-center gap-2">
              <input
                inputMode="numeric"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min ₺"
                className="w-24 border rounded-lg px-2 py-2 text-sm"
                aria-label="Minimum fiyat"
              />
              <span className="text-gray-400">—</span>
              <input
                inputMode="numeric"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max ₺"
                className="w-24 border rounded-lg px-2 py-2 text-sm"
                aria-label="Maksimum fiyat"
              />
              <button
                type="button"
                onClick={() => setApplied({ min: minPrice, max: maxPrice })}
                className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-50 text-sm font-medium"
              >
                Uygula
              </button>
            </div>
          </div>

          {loading ? (
            <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  <div className="aspect-square bg-gray-200" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 bg-gray-200 rounded" />
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {filtered.length > 0 ? (
                  filtered.map((p) => {
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
                        className="group border rounded-lg bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="relative aspect-square bg-gray-100">
                          <Image
                            src={imageSrc}
                            alt={p.name || "Ürün"}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-200"
                            sizes="(max-width: 640px) 50vw, 20vw"
                            unoptimized
                          />
                          <span className="absolute left-2 top-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded">
                            {(p.stock ?? 0) > 0 ? "Stokta" : "Tükendi"}
                          </span>
                        </div>
                        <div className="p-2 sm:p-3">
                          <div className="font-medium line-clamp-2 text-sm sm:text-base group-hover:text-primary">
                            {p.name || "Ürün"}
                          </div>
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm sm:text-base">
                              ₺{Number(p.price || 0).toFixed(2)}
                            </span>
                            <AddToCartButton
                              productId={productId}
                              productData={p}
                              disabled={(p.stock ?? 0) <= 0}
                            />
                          </div>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="col-span-full text-center py-16 text-gray-500">
                    <p className="text-lg font-medium">Bu kategoride henüz ürün yok</p>
                    <p className="text-sm mt-2">
                      Admin panelinden bu kategoriye ürün ekleyebilirsiniz.
                    </p>
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("")}
                      className="mt-4 text-primary hover:underline text-sm"
                    >
                      Başka kategori seç
                    </button>
                  </div>
                )}
              </div>
              {pagination.pages > 1 && (
                <nav className="flex justify-center gap-2 mt-8" aria-label="Sayfalama">
                  {Array.from({ length: pagination.pages }).map((_, i) => {
                    const pageNum = i + 1;
                    const isActive = pagination.page === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => load(pageNum)}
                        className={`px-3 py-1 rounded border text-sm ${
                          isActive
                            ? "bg-gray-800 text-white"
                            : "bg-white hover:bg-gray-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </nav>
              )}
            </>
          )}
        </section>
      ) : (
        <p className="text-center text-slate-500 text-sm py-4 border-t border-dashed border-slate-200">
          Ürünleri görmek için yukarıdan bir kategori seçin.
        </p>
      )}
    </main>
  );
}
