"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import AddToCartButton from "../components/AddToCartButton";
import LoadingSkeleton from "../components/LoadingSkeleton";
import ProductCard from "../components/ProductCard";
import CategoryCard from "../components/CategoryCard";
import TestimonialCard from "../components/TestimonialCard";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { resolveMediaUrl } from "../lib/images";
import { getBrowserApiBase } from "../lib/api-base";
import { useSiteContent } from "../context/SiteContentContext";
import { asArray } from "../lib/safeString";

/** Client: LAN + loopback env düzeltmesi; boş base = aynı origin + /api rewrite */
function storefrontApiOrigin() {
  const b = getBrowserApiBase();
  if (b) return b.replace(/\/+$/, "");
  return typeof window !== "undefined" ? window.location.origin : "http://127.0.0.1:3000";
}

export default function Home() {
  const { content } = useSiteContent();
  const testimonials = content.testimonials?.length
    ? content.testimonials
    : [];
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [sort, setSort] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: "",
    minPrice: "",
    maxPrice: "",
    inStock: false
  });

  const [heroBanners, setHeroBanners] = useState([]);
  const [heroIndex, setHeroIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const apiBase = storefrontApiOrigin();
        const res = await fetch(
          new URL("/api/banners?type=hero", apiBase.endsWith("/") ? apiBase : `${apiBase}/`).toString(),
          { cache: "no-store" }
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (!cancelled && list.length > 0) {
          const posRank = { top: 0, middle: 1, bottom: 2 };
          const sorted = [...list].sort(
            (a, b) => (posRank[a.position] ?? 9) - (posRank[b.position] ?? 9) || (a.order || 0) - (b.order || 0)
          );
          setHeroBanners(sorted);
          setHeroIndex(0);
        }
      } catch {
        /* storefront: banner yoksa statik hero */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (heroBanners.length <= 1) return undefined;
    const id = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroBanners.length);
    }, 6500);
    return () => clearInterval(id);
  }, [heroBanners.length]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const q = params.get('q') || '';
      const category = params.get('category') || '';
      const page = params.get('page') || '1';
      
      // Load products and categories in parallel
      const apiBase = storefrontApiOrigin();
      const url = new URL("/api/products", apiBase.endsWith("/") ? apiBase : `${apiBase}/`);
      if (q) url.searchParams.set('q', q);
      if (category) url.searchParams.set('category', category);
      if (filters.category) url.searchParams.set('category', filters.category);
      if (filters.minPrice) url.searchParams.set('minPrice', filters.minPrice);
      if (filters.maxPrice) url.searchParams.set('maxPrice', filters.maxPrice);
      if (filters.inStock) url.searchParams.set('inStock', 'true');
      url.searchParams.set('page', page);
      url.searchParams.set('limit', '24');
      url.searchParams.set('sort', sort);
      
      const [productsRes, categoriesRes] = await Promise.all([
        fetch(url),
        fetch(new URL("/api/categories", apiBase.endsWith("/") ? apiBase : `${apiBase}/`).toString())
      ]);

      const productsData = await productsRes.json().catch(() => ({}));
      if (!productsRes.ok) {
        const msg = productsData?.message || productsData?.error || "Ürünler yüklenemedi";
        throw new Error(typeof msg === "string" ? msg : "Ürünler yüklenemedi");
      }

      const categoriesRaw = categoriesRes.ok ? await categoriesRes.json().catch(() => []) : [];
      const categoriesList = asArray(categoriesRaw);

      setProducts(productsData.items || []);
      setPagination({ page: productsData.page || 1, pages: productsData.pages || 1, total: productsData.total || 0 });
      setCategories(categoriesList.slice(0, 6));
    } catch (err) {
      setError(err?.message || "Bir hata oluştu");
    }
    setLoading(false);
  }, [sort, filters]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSortChange = (e) => {
    setSort(e.target.value);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      category: "",
      minPrice: "",
      maxPrice: "",
      inStock: false
    });
  };

  if (error) {
    return (
      <main className="storefront-page flex items-center justify-center">
        <Card className="text-center py-12 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Bir hata oluştu</h3>
          <p className="text-secondary mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Tekrar Dene
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="storefront-page w-full min-w-0 overflow-x-hidden">
      {/* Hero: API banner varsa carousel, yoksa varsayılan */}
      {heroBanners.length > 0 ? (() => {
        const hero = heroBanners[heroIndex] || heroBanners[0];
        const bg = hero.backgroundColor || "#1e40af";
        const fg = hero.textColor || "#ffffff";
        const img =
          hero.image && String(hero.image).trim() ? resolveMediaUrl(hero.image) : null;
        const imgMobile =
          hero.mobileImage && String(hero.mobileImage).trim()
            ? resolveMediaUrl(hero.mobileImage)
            : img;
        const ctaHref = hero.link && hero.link.trim() ? hero.link : "/search";
        return (
          <section
            className="relative min-h-[520px] sm:min-h-[600px] overflow-hidden text-white"
            style={{ backgroundColor: bg }}
          >
            {img ? (
              <>
                <div className="absolute inset-0 hidden sm:block">
                  <Image
                    src={img}
                    alt={hero.title || "Banner"}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover opacity-90"
                  />
                </div>
                <div className="absolute inset-0 sm:hidden">
                  <Image
                    src={imgMobile}
                    alt={hero.title || "Banner"}
                    fill
                    priority
                    sizes="100vw"
                    className="object-cover opacity-90"
                  />
                </div>
              </>
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-black/35" aria-hidden />
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center flex flex-col items-center justify-center min-h-[520px] sm:min-h-[600px]">
              <div className="animate-fade-in-up max-w-4xl">
                {hero.subtitle ? (
                  <p className="text-sm sm:text-base font-medium uppercase tracking-wide mb-3 opacity-90" style={{ color: fg }}>
                    {hero.subtitle}
                  </p>
                ) : null}
                <h1
                  className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 drop-shadow-md"
                  style={{ color: fg }}
                >
                  {hero.title || "Anadolu Feneri Cam Sanat Merkezi"}
                </h1>
                {hero.description ? (
                  <p className="text-lg sm:text-xl mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed opacity-95" style={{ color: fg }}>
                    {hero.description}
                  </p>
                ) : (
                  <p className="text-lg sm:text-xl mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed opacity-95" style={{ color: fg }}>
                    Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat ile alışverişin keyfini çıkarın
                  </p>
                )}
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href={ctaHref} className="inline-flex">
                    <Button size="lg" className="btn-gradient shadow-glow hover-lift">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      {hero.buttonText || "Detay"}
                    </Button>
                  </Link>
                  <Link href="/campaigns" className="inline-flex">
                    <Button size="lg" variant="outline" className="border-2 border-white/40 hover:bg-white/10 backdrop-blur-sm" style={{ color: fg }}>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Kampanyalar
                    </Button>
                  </Link>
                </div>
              </div>
              {heroBanners.length > 1 ? (
                <div className="mt-10 flex justify-center gap-2">
                  {heroBanners.map((b, i) => (
                    <button
                      key={b.id || i}
                      type="button"
                      aria-label={`Slayt ${i + 1}`}
                      onClick={() => setHeroIndex(i)}
                      className={`h-2.5 rounded-full transition-all ${i === heroIndex ? "w-8 bg-white" : "w-2.5 bg-white/50 hover:bg-white/70"}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        );
      })() : (
        <section className="relative min-h-[480px] sm:min-h-[520px] flex items-center overflow-hidden theme-hero-fallback text-white py-16 sm:py-20 w-full">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute inset-0 theme-hero-fallback-overlay"></div>
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 theme-hero-blob-accent rounded-full blur-3xl"></div>
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center w-full">
            <div className="animate-fade-in-up w-full max-w-full">
              <h1 className="text-2xl sm:text-5xl lg:text-7xl font-bold mb-4 sm:mb-6 px-2 break-words theme-hero-heading">
                Anadolu Feneri Cam Sanat Merkezi
              </h1>
              <p className="text-base sm:text-xl lg:text-2xl theme-hero-subtitle mb-8 sm:mb-10 max-w-4xl mx-auto leading-relaxed px-4">
                Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat ile alışverişin keyfini çıkarın
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/search" className="inline-flex">
                  <Button size="lg" className="btn-gradient shadow-glow hover-lift">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Ürünleri Keşfet
                  </Button>
                </Link>
                <Link href="/campaigns" className="inline-flex">
                  <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm glass-effect">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Kampanyalar
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Categories Section */}
      <section className="py-16 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
              <span className="gradient-text">Kategoriler</span>
            </h2>
            <p className="text-base sm:text-xl text-secondary max-w-2xl mx-auto px-4">
              İhtiyacınıza uygun kategorileri keşfedin
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div key={category.id || category._id || `category-${index}`} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CategoryCard category={category} />
              </div>
            ))}
          </div>
          
          <div className="text-center mt-12">
            <Link href="/categories" className="inline-block">
              <span className="btn-primary inline-flex items-center">
                Tüm Kategorileri Gör
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="text-2xl sm:text-4xl font-bold text-foreground mb-4">
              <span className="gradient-text">Ürünlerimiz</span>
            </h2>
            <p className="text-base sm:text-xl text-secondary max-w-2xl mx-auto px-4">
              En kaliteli ürünleri keşfedin ve alışveriş deneyiminizi yaşayın
            </p>
          </div>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-background rounded-lg shadow-sm border border-border hover:border-primary hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                <span className="text-sm font-medium">Filtrele</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="sort-select" className="text-sm font-medium text-foreground/80">Sırala:</label>
              <select
                id="sort-select"
                value={sort} 
                onChange={handleSortChange} 
                className="input-modern text-sm"
                aria-label="Ürünleri sırala"
              >
                <option value="newest">En Yeni</option>
                <option value="price_asc">Fiyat Artan</option>
                <option value="price_desc">Fiyat Azalan</option>
              </select>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mb-8 p-6 bg-background rounded-xl shadow-sm border border-border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full input-modern"
                  >
                    <option value="">Tüm Kategoriler</option>
                    {categories.map((category, idx) => (
                      <option key={category.id || category._id || `cat-${idx}`} value={category.id || category._id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Min Fiyat</label>
                  <input
                    type="number"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    placeholder="0"
                    className="w-full input-modern"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Max Fiyat</label>
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    placeholder="1000"
                    className="w-full input-modern"
                  />
                </div>
                
                <div className="flex items-end">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.inStock}
                      onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Stokta Olanlar</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Filtreleri Temizle
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="grid-responsive">
              <LoadingSkeleton type="product" count={12} />
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-secondary/25 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-foreground mb-3">Henüz ürün yok</h3>
              <p className="text-lg text-secondary mb-6">Yakında harika ürünlerle burada olacağız!</p>
              <div className="text-center">
                <p className="text-sm text-foreground/60">Ürünler admin panelinden eklenir</p>
              </div>
            </div>
          ) : (
            <div className="grid-responsive">
              {products.map((product, index) => (
                <div key={product.id || product._id || `product-${index}`} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-16 flex justify-center">
              <nav className="flex items-center space-x-1 bg-background rounded-lg shadow-sm border border-border p-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <Link
                    key={page}
                    href={`?page=${page}`}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      page === pagination.page
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-foreground/80 hover:bg-surface hover:text-foreground'
                    }`}
                  >
                    {page}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 section-muted-band">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              <span className="gradient-text">Müşteri Yorumları</span>
            </h2>
            <p className="text-xl text-secondary max-w-2xl mx-auto">
              Müşterilerimizin deneyimlerini okuyun
            </p>
          </div>
          
          {testimonials.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <div key={index} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                  <TestimonialCard
                    testimonial={{
                      ...testimonial,
                      avatar:
                        testimonial.avatar ||
                        (testimonial.name ? String(testimonial.name).charAt(0) : "?")
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter Section is included globally in layout; avoid duplicate on homepage */}
    </main>
  );
}

