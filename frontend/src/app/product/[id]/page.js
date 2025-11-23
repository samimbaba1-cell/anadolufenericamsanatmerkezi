"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import AddToCartButton from "../../../components/AddToCartButton";
import LoadingSkeleton from "../../../components/LoadingSkeleton";
import ReviewList from "../../../components/ReviewList";
import ReviewForm from "../../../components/ReviewForm";
import StarRating from "../../../components/StarRating";
import { resolveMediaUrl } from "../../../lib/images";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/products/${params.id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || "Ürün bulunamadı");
        }
        const data = await res.json();
        const productData = data?.product || data;
        const relatedData = data?.relatedProducts || [];

        if (!productData) {
          throw new Error("Ürün bilgisi alınamadı");
        }

        const rawImages = Array.isArray(productData.images) && productData.images.length ? productData.images : [null];
        const normalizedImages = rawImages
          .map((img) => resolveMediaUrl(img, "/images/placeholder-product.jpg"))
          .filter(Boolean);

        setProduct({
          ...productData,
          name: productData.name || "Ürün",
          description: productData.description || "",
          shortDescription: productData.shortDescription || "",
          price: normalizeNumber(productData.price),
          stock: normalizeNumber(productData.stock),
          images: normalizedImages
        });
        setSelectedImage(0);

        if (relatedData.length > 0) {
          setRelatedProducts(Array.isArray(relatedData) ? relatedData : []);
        } else {
          const categoryId = productData.category?._id || productData.category;
          if (categoryId) {
            const relatedRes = await fetch(`${API_URL}/api/products?category=${categoryId}&limit=4`);
            if (relatedRes.ok) {
              const relatedJson = await relatedRes.json();
              setRelatedProducts(relatedJson.items || []);
            }
          }
        }
      } catch (err) {
        console.error("Product load error:", err);
        setError(err.message || "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadProduct();
    }
  }, [params.id]);

  const displayPrice = useMemo(() => {
    if (!product) return "0.00";
    const price = typeof product.price === "number" && !Number.isNaN(product.price) ? product.price : 0;
    return price.toFixed(2);
  }, [product]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton type="product-detail" />
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="max-w-7xl mx_auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Ürün Bulunamadı</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href="/" className="btn-primary">
            Ana Sayfaya Dön
          </Link>
        </div>
      </main>
    );
  }

  const isOutOfStock = (product.stock ?? 0) <= 0;
  const images = product.images?.length
    ? product.images
    : [resolveMediaUrl(null, "/images/placeholder-product.jpg")];

  const productName = product.name || "Ürün";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          <li><Link href="/" className="hover:text-primary">Anasayfa</Link></li>
          <li>/</li>
          <li><Link href="/categories" className="hover:text-primary">Kategoriler</Link></li>
          <li>/</li>
          <li><span className="text-gray-900">{product.category?.name || 'Kategori'}</span></li>
          <li>/</li>
          <li><span className="text-gray-900">{product.name}</span></li>
        </ol>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
            <Image
              src={images[selectedImage]}
              alt={`${productName} görseli`}
              width={600}
              height={600}
              className="w-full h-full object-cover"
              unoptimized
            />
          </div>

          {images.length > 1 && (
            <div className="flex space-x-2 overflow-x-auto">
              {images.map((image, index) => (
                <button
                  key={image + index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                    selectedImage === index ? 'border-primary' : 'border-gray-200'
                  }`}
                >
                  <Image
                    src={image}
                    alt={`${productName} ${index + 1}`}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{productName}</h1>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                <span className="text-3xl font-bold text-primary">₺{displayPrice}</span>
              </div>
              {product.originalPrice && Number(product.originalPrice) > Number(product.price) && (
                <span className="text-xl text-gray-500 line-through">
                  ₺{Number(product.originalPrice).toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center space-x-3 mb-4">
              <StarRating
                value={Number(product?.rating?.average) || 0}
                readOnly
                size={20}
              />
              <span className="text-sm text-gray-700 font-medium">
                {(Number(product?.rating?.average) || 0).toFixed(1)} / 5
              </span>
              <a href="#reviews" className="text-sm text-gray-600 hover:text-primary transition-colors">
                ({Number(product?.rating?.count) || 0} değerlendirme)
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOutOfStock ? (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                Stokta Yok
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                Stokta ({product.stock} adet)
              </span>
            )}
          </div>

          {product.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Açıklama</h3>
              <p className="text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border rounded">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-gray-700 hover:bg-gray-100"
                >
                  −
                </button>
                <span className="px-4 py-2 text-lg font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="px-3 py-2 text-gray-700 hover:bg-gray-100"
                >
                  +
                </button>
              </div>
              <AddToCartButton
                productId={product._id}
                productData={product}
                quantity={quantity}
                disabled={isOutOfStock}
                data-testid="add-to-cart"
              />
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              {(product.brandRef?.name || product.brand) && (
                <div>
                  <span className="font-medium text-gray-700">Marka:</span>{" "}
                  {product.brandRef?.name || product.brand}
                </div>
              )}
              {product.sku && (
                <div><span className="font-medium text-gray-700">SKU:</span> {product.sku}</div>
              )}
              {product.barcode && (
                <div><span className="font-medium text-gray-700">Barkod:</span> {product.barcode}</div>
              )}
              {product.expiryDate && (
                <div><span className="font-medium text-gray-700">SKT:</span> {new Date(product.expiryDate).toLocaleDateString()}</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div id="reviews" />
      <ReviewForm
        productId={product._id}
        onSubmitted={() => {
          // no-op: ReviewList fetches on prop change; we can trigger a re-render by a key
          setSelectedImage((v) => v); // simple state touch to re-render siblings
        }}
      />
      <ReviewList productId={product._id} />

      {Array.isArray(relatedProducts) && relatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">Benzer Ürünler</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((item) => (
              <Card key={item._id} className="p-4">
                <Link href={`/product/${item._id}`}>
                  <div className="aspect-square bg-gray-100 rounded mb-4 overflow-hidden">
                    <Image
                      src={resolveMediaUrl(item.images?.[0])}
                      alt={item.name || "Ürün"}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <h3 className="font-medium text-gray-900 line-clamp-2">{item.name}</h3>
                  <p className="text-primary font-semibold mt-2">
                    ₺{Number(item.price || 0).toFixed(2)}
                  </p>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}