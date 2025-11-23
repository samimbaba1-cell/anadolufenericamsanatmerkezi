"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export default function Home() {
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

  // Sample testimonials data
  const testimonials = [
    {
      id: 1,
      name: "Ahmet Yılmaz",
      role: "Müşteri",
      content: "Anadolu Feneri Cam Sanat Merkezi'nden alışveriş yapmak gerçekten keyifli. El yapımı cam ürünler harika ve teslimat hızlı. Kesinlikle tavsiye ederim!",
      rating: 5,
      avatar: "A"
    },
    {
      id: 2,
      name: "Fatma Demir",
      role: "Müşteri",
      content: "Fiyatlar çok uygun ve müşteri hizmetleri çok ilgili. Sorun yaşadığımda hemen çözdüler. Teşekkürler!",
      rating: 5,
      avatar: "F"
    },
    {
      id: 3,
      name: "Mehmet Kaya",
      role: "Müşteri",
      content: "Ürün çeşitliliği harika. Aradığım her şeyi bulabiliyorum. Özellikle elektronik ürünlerde çok başarılılar.",
      rating: 4,
      avatar: "M"
    }
  ];

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const q = params.get('q') || '';
      const category = params.get('category') || '';
      const page = params.get('page') || '1';
      
      // Load products and categories in parallel
      const url = new URL(`${API_URL}/api/products`);
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
        fetch(`${API_URL}/api/categories`)
      ]);
      
      const [productsData, categoriesData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json()
      ]);
      
      setProducts(productsData.items || []);
      setPagination({ page: productsData.page || 1, pages: productsData.pages || 1, total: productsData.total || 0 });
      setCategories(categoriesData.slice(0, 6)); // Show only first 6 categories
    } catch (err) {
      setError(err.message);
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
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <Card className="text-center py-12 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Bir hata oluştu</h3>
          <p className="text-slate-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Tekrar Dene
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white py-20">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/90 to-purple-600/90"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
              Anadolu Feneri Cam Sanat Merkezi
            </h1>
            <p className="text-xl sm:text-2xl text-blue-100 mb-10 max-w-4xl mx-auto leading-relaxed">
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

      {/* Categories Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              <span className="gradient-text">Kategoriler</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              İhtiyacınıza uygun kategorileri keşfedin
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category, index) => (
              <div key={category._id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
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
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              <span className="gradient-text">Ürünlerimiz</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              En kaliteli ürünleri keşfedin ve alışveriş deneyiminizi yaşayın
            </p>
          </div>

          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-primary hover:text-primary transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.707V4z" />
                </svg>
                <span className="text-sm font-medium">Filtrele</span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <label htmlFor="sort-select" className="text-sm font-medium text-slate-700">Sırala:</label>
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
            <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full input-modern"
                  >
                    <option value="">Tüm Kategoriler</option>
                    {categories.map(category => (
                      <option key={category._id} value={category._id}>
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
              <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3">Henüz ürün yok</h3>
              <p className="text-lg text-slate-600 mb-6">Yakında harika ürünlerle burada olacağız!</p>
              <div className="text-center">
                <p className="text-sm text-slate-500">Ürünler admin panelinden eklenir</p>
              </div>
            </div>
          ) : (
            <div className="grid-responsive">
              {products.map((product, index) => (
                <div key={product._id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.1}s` }}>
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-16 flex justify-center">
              <nav className="flex items-center space-x-1 bg-white rounded-lg shadow-sm border border-gray-200 p-1">
                {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((page) => (
                  <Link
                    key={page}
                    href={`?page=${page}`}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                      page === pagination.page
                        ? 'bg-primary text-white shadow-sm'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
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
      <section className="py-16 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              <span className="gradient-text">Müşteri Yorumları</span>
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Müşterilerimizin deneyimlerini okuyun
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={testimonial.id} className="animate-fade-in-up" style={{ animationDelay: `${index * 0.2}s` }}>
                <TestimonialCard testimonial={testimonial} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Newsletter Section is included globally in layout; avoid duplicate on homepage */}
    </main>
  );
}

