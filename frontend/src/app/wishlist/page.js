"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import ProductCard from "../../components/ProductCard";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { useToast } from "../../context/ToastContext";
import { useState, useEffect } from "react";
import { getAbsoluteApiUrl } from "../../lib/api";

export default function WishlistPage() {
  const { ids, removeItem, clearWishlist } = useWishlist();
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function fetchWishlistProducts() {
      if (!ids.length) {
        setProducts([]);
        return;
      }
      setLoadingItems(true);
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await fetch(getAbsoluteApiUrl(`/api/products/${id}`));
              if (!res.ok) return null;
              const data = await res.json();
              return data.product || data;
            } catch (error) {
              console.error("Wishlist fetch error", error);
              return null;
            }
          })
        );
        if (!cancelled) {
          setProducts(results.filter(Boolean));
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Wishlist load error", error);
          showToast(error.message || "Favori ürünler yüklenemedi", "error");
        }
      } finally {
        if (!cancelled) {
          setLoadingItems(false);
        }
      }
    }
    fetchWishlistProducts();
    return () => {
      cancelled = true;
    };
  }, [ids, showToast]);

  const favoriteCount = ids.length;

  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Favoriler Sayfası</h1>
          <p className="text-gray-600 mb-8">Favorilerinizi görmek için giriş yapmanız gerekiyor</p>
          <Button onClick={() => router.push("/login")} className="btn-primary">
            Giriş Yap
          </Button>
        </div>
      </main>
    );
  }

  if (favoriteCount === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Favorilerim</h1>
            <p className="text-gray-600 mt-2">Beğendiğiniz ürünleri burada saklayabilirsiniz</p>
        </div>

        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Favori Ürününüz Yok</h2>
            <p className="text-gray-600 mb-8">Beğendiğiniz ürünleri favorilere ekleyerek burada saklayabilirsiniz</p>
          <Link href="/" className="btn-primary">
            Alışverişe Başla
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Favorilerim</h1>
            <p className="text-gray-600 mt-2">{favoriteCount} ürün favorilerinizde</p>
          </div>
          <Button
            onClick={clearWishlist}
            variant="secondary"
            className="text-red-600 hover:text-red-800"
            disabled={favoriteCount === 0}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Tümünü Temizle
          </Button>
        </div>
      </div>

      {loadingItems && products.length === 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <LoadingSkeleton key={idx} type="product" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map((product) => (
            <div key={product._id} className="relative group">
              <ProductCard product={product} />
              <button
                onClick={() => removeItem(product._id)}
                className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-red-100 hover:text-red-600 z-10"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-12">
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="text-center sm:text-left">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Favorilerinizde {favoriteCount} ürün var
              </h3>
              <p className="text-gray-600">
                Beğendiğiniz ürünleri sepete ekleyerek alışverişe devam edebilirsiniz
              </p>
            </div>
            <div className="flex space-x-4">
              <Link href="/" className="btn-secondary">
                Alışverişe Devam Et
              </Link>
              <Link href="/cart" className="btn-primary">
                Sepete Git
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}