"use client";
import { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import Image from "next/image";
import { getApiBaseUrl } from "../../lib/api";
import Link from "next/link";
import AddToCartButton from "../../components/AddToCartButton";
import { resolveMediaUrl } from "../../lib/images";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function CategoriesPageContent() {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState("");
  const [products, setProducts] = useState([]);
  const [sort, setSort] = useState("newest");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [applied, setApplied] = useState({ min: "", max: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${getApiBaseUrl()}/api/categories`).then(r=>r.json()).then(setCategories).catch(()=>{});
  }, []);

  const load = useCallback(async (page=1) => {
    setLoading(true);
    const url = new URL(`${getApiBaseUrl()}/api/products`);
    url.searchParams.set("limit", "24");
    url.searchParams.set("page", String(page));
    if (selected) url.searchParams.set("category", selected);
    try {
      const r = await fetch(url.toString());
      const d = await r.json();
      let items = d.items || [];
      if (sort === "price_asc") items = items.sort((a,b)=> (a.price||0) - (b.price||0));
      if (sort === "price_desc") items = items.sort((a,b)=> (b.price||0) - (a.price||0));
      setProducts(items);
      setPagination({ page: d.page, pages: d.pages, total: d.total });
    } catch (_) {
      setProducts([]);
      setPagination({ page: 1, pages: 1, total: 0 });
    } finally {
      setLoading(false);
    }
  }, [selected, sort]);

  useEffect(() => { load(1); }, [load]);

  const filtered = useMemo(() => {
    const min = applied.min ? parseFloat(applied.min) : null;
    const max = applied.max ? parseFloat(applied.max) : null;
    return products.filter(p => {
      const price = Number(p.price||0);
      if (min !== null && price < min) return false;
      if (max !== null && price > max) return false;
      return true;
    });
  }, [products, applied]);

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      <h1 className="text-xl sm:text-2xl font-semibold mb-4 sm:mb-6">Kategoriler</h1>
      <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <label htmlFor="category-select" className="sr-only">Kategori seçin</label>
          <select 
            id="category-select"
            value={selected} 
            onChange={(e)=>setSelected(e.target.value)} 
            className="border rounded px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Kategori seçin"
          >
            <option value="">Hepsi</option>
            {categories.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
          <label htmlFor="sort-select" className="sr-only">Sıralama seçin</label>
          <select 
            id="sort-select"
            value={sort} 
            onChange={(e)=>setSort(e.target.value)} 
            className="border rounded px-3 py-2 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-label="Sıralama seçin"
          >
            <option value="newest">En Yeni</option>
            <option value="price_asc">Fiyat Artan</option>
            <option value="price_desc">Fiyat Azalan</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="min-price" className="sr-only">Minimum fiyat</label>
          <input 
            id="min-price"
            inputMode="numeric" 
            pattern="[0-9]*" 
            value={minPrice} 
            onChange={(e)=>setMinPrice(e.target.value)} 
            placeholder="Min" 
            className="w-20 sm:w-24 border rounded px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            aria-label="Minimum fiyat"
          />
          <span className="text-gray-500">-</span>
          <label htmlFor="max-price" className="sr-only">Maksimum fiyat</label>
          <input 
            id="max-price"
            inputMode="numeric" 
            pattern="[0-9]*" 
            value={maxPrice} 
            onChange={(e)=>setMaxPrice(e.target.value)} 
            placeholder="Max" 
            className="w-20 sm:w-24 border rounded px-2 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
            aria-label="Maksimum fiyat"
          />
          <button 
            onClick={()=>setApplied({ min: minPrice, max: maxPrice })} 
            className="px-3 py-2 rounded border bg-white hover:bg-gray-50 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            type="button"
            aria-label="Fiyat filtresini uygula"
          >
            Uygula
          </button>
        </div>
      </div>
      {loading ? (
        <div className="animate-pulse grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          {Array.from({ length: 12 }).map((_, idx) => (
            <div key={idx} className="border rounded-md bg-white overflow-hidden">
              <div className="aspect-square bg-gray-200" />
              <div className="p-2 sm:p-3 space-y-2">
                <div className="h-3 sm:h-4 bg-gray-200 rounded" />
                <div className="h-3 sm:h-4 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {filtered.map(p => (
              <Link key={p._id} href={`/product/${p._id}`} className="group border rounded-md bg-white shadow-sm overflow-hidden hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-500">
                <div className="relative aspect-square bg-gray-100 flex items-center justify-center text-sm text-gray-500">
                  <Image 
                    src={resolveMediaUrl(p.images?.[0], "/images/placeholder-product.jpg")} 
                    alt={p.name || "Kategori ürünü"} 
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200" 
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    unoptimized
                  />
                  <span className="absolute left-2 top-2 text-xs bg-black/70 text-white px-2 py-0.5 rounded">
                    {(p.stock ?? 0) > 0 ? "Stokta" : "Tükendi"}
                  </span>
                </div>
                <div className="p-2 sm:p-3">
                  <div className="font-medium line-clamp-2 min-h-[2.5rem] sm:min-h-[3rem] text-sm sm:text-base group-hover:text-blue-600 transition-colors">
                    {p.name || "Ürün"}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                    {(p.brandRef?.name || p.brand) && (
                      <div>
                        <span className="font-semibold text-gray-700">Marka:</span>{" "}
                        {p.brandRef?.name || p.brand}
                      </div>
                    )}
                    {p.category?.name && (
                      <div>
                        <span className="font-semibold text-gray-700">Kategori:</span>{" "}
                        {p.category.name}
                      </div>
                    )}
                    {p.rating?.average > 0 && (
                      <div>
                        <span className="font-semibold text-gray-700">Puan:</span>{" "}
                        {p.rating.average.toFixed(1)} / 5 ({p.rating.count || 0})
                      </div>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="font-semibold text-sm sm:text-base">
                      ₺{Number(p.price||0).toFixed(2)}
                    </div>
                    <AddToCartButton productId={p._id} productData={p} disabled={(p.stock ?? 0) <= 0} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {pagination.pages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-6" aria-label="Sayfa navigasyonu">
              {Array.from({ length: pagination.pages }).map((_, i) => {
                const pageNum = i + 1;
                const isActive = pagination.page === pageNum;
                return (
                  <button 
                    key={pageNum} 
                    onClick={()=>load(pageNum)} 
                    className={`px-3 py-1 rounded border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isActive 
                        ? 'bg-gray-800 text-white border-gray-800' 
                        : 'bg-white hover:bg-gray-50 border-gray-300'
                    }`}
                    aria-label={`Sayfa ${pageNum}`}
                    aria-current={isActive ? 'page' : undefined}
                    type="button"
                  >
                    {pageNum}
                  </button>
                );
              })}
            </nav>
          )}
        </>
      )}
    </main>
  );
}

export default function CategoriesPage() {
  return <CategoriesPageContent />;
}
