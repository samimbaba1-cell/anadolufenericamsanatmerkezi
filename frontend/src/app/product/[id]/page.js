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
import { getBrowserApiBase } from "../../../lib/api-base";
import { useLocale } from "../../../context/LocaleContext";

const normalizeNumber = (value) => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isNaN(value) ? 0 : value;
  const normalized = String(value).replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export default function ProductDetailPage() {
  const { routes, paths, t } = useLocale();
  const params = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(-1);
  const [quantity, setQuantity] = useState(1);
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        const apiBase = getBrowserApiBase();
        const res = await fetch(`${apiBase}/api/products/${params.id}`);
        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error || t("product.notFound"));
        }
        const data = await res.json();
        const productData = data?.product || data;
        const relatedData = data?.relatedProducts || [];

        if (!productData) {
          throw new Error(t("product.loadError"));
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
          originalPrice: normalizeNumber(productData.originalPrice),
          stock: normalizeNumber(productData.stock),
          images: normalizedImages,
          variants: Array.isArray(productData.variants) ? productData.variants : []
        });
        setSelectedImage(0);
        setSelectedVariantIndex(-1);

        if (relatedData.length > 0) {
          setRelatedProducts(Array.isArray(relatedData) ? relatedData : []);
        } else {
          const categoryId =
            productData.categoryId ||
            productData.category?.id ||
            productData.category?._id ||
            productData.category;
          if (categoryId) {
            const relatedRes = await fetch(
              `${apiBase}/api/products?category=${categoryId}&limit=4`
            );
            if (relatedRes.ok) {
              const relatedJson = await relatedRes.json();
              const selfId = String(productData.id ?? productData._id ?? "");
              const items = (relatedJson.items || []).filter(
                (item) => String(item.id ?? item._id) !== selfId
              );
              setRelatedProducts(items);
            }
          }
        }
      } catch (err) {
        console.error("Product load error:", err);
        setError(err.message || t("common.error"));
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      loadProduct();
    }
  }, [params.id, t]);

  const activeVariant = useMemo(() => {
    if (!product?.variants?.length || selectedVariantIndex < 0) return null;
    return product.variants[selectedVariantIndex] || null;
  }, [product, selectedVariantIndex]);

  const displayPrice = useMemo(() => {
    if (!product) return "0.00";
    const raw = activeVariant?.price != null ? activeVariant.price : product.price;
    const price = normalizeNumber(raw);
    return price.toFixed(2);
  }, [product, activeVariant]);

  const displayOriginalPrice = useMemo(() => {
    if (!product) return null;
    const raw = activeVariant?.originalPrice != null ? activeVariant.originalPrice : product.originalPrice;
    const n = normalizeNumber(raw);
    return n > 0 ? n : null;
  }, [product, activeVariant]);

  const displayStock = useMemo(() => {
    if (!product) return 0;
    if (activeVariant && activeVariant.stock != null) return normalizeNumber(activeVariant.stock);
    return normalizeNumber(product.stock);
  }, [product, activeVariant]);

  const galleryImages = useMemo(() => {
    if (!product) {
      return [resolveMediaUrl(null, "/images/placeholder-product.jpg")];
    }
    const variantImgs =
      activeVariant?.images?.length > 0
        ? activeVariant.images.map((img) => resolveMediaUrl(img, "/images/placeholder-product.jpg"))
        : [];
    const base = product.images?.length
      ? product.images
      : [resolveMediaUrl(null, "/images/placeholder-product.jpg")];
    if (variantImgs.length) {
      const merged = [...variantImgs];
      base.forEach((img) => {
        if (!merged.includes(img)) merged.push(img);
      });
      return merged;
    }
    return base;
  }, [product, activeVariant]);

  if (loading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton type="product-detail" />
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="w-24 h-24 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-red-600 mb-4">{t("product.notFound")}</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link href={routes.home} className="btn-primary">
            {t("product.backToShop")}
          </Link>
        </div>
      </main>
    );
  }

  const isOutOfStock = displayStock <= 0;
  const images = galleryImages;
  const productName = product.name || "Ürün";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="mb-8">
        <ol className="flex items-center space-x-2 text-sm text-gray-600">
          <li><Link href={routes.home} className="hover:text-primary">{t("product.breadcrumbHome")}</Link></li>
          <li>/</li>
          <li><Link href={routes.categories} className="hover:text-primary">{t("product.breadcrumbCategories")}</Link></li>
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
              data-testid="product-primary-image"
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
                  key={`img-${product.id ?? product._id ?? "p"}-${index}`}
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
              {displayOriginalPrice && displayOriginalPrice > Number(displayPrice) && (
                <span className="text-xl text-gray-500 line-through">
                  ₺{displayOriginalPrice.toFixed(2)}
                </span>
              )}
            </div>

            {product.variants?.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-800">{t("product.options")}</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((variant, index) => {
                    const label =
                      variant.name ||
                      [variant.color, variant.size, variant.ringSize].filter(Boolean).join(" · ") ||
                      t("product.optionN", { n: index + 1 });
                    const selected = selectedVariantIndex === index;
                    return (
                      <button
                        key={`variant-${index}`}
                        type="button"
                        onClick={() => {
                          setSelectedVariantIndex(index);
                          setSelectedImage(0);
                          setQuantity(1);
                        }}
                        className={`rounded-lg border px-3 py-2 text-sm transition ${
                          selected
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-gray-200 hover:border-primary/50"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

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
                {t("product.reviewsCount", { count: Number(product?.rating?.count) || 0 })}
              </a>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isOutOfStock ? (
              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                {t("product.outOfStock")}
              </span>
            ) : (
              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                {t("product.inStockCount", { count: displayStock })}
              </span>
            )}
          </div>

          {product.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">{t("product.description")}</h3>
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
                productId={product.id ?? product._id}
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
        productId={product.id ?? product._id}
        onSubmitted={() => {
          // no-op: ReviewList fetches on prop change; we can trigger a re-render by a key
          setSelectedImage((v) => v); // simple state touch to re-render siblings
        }}
      />
      <ReviewList productId={product.id ?? product._id} />

      {Array.isArray(relatedProducts) && relatedProducts.length > 0 && (
        <section>
          <h2 className="text-2xl font-semibold mb-4">{t("product.relatedTitle")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((item, index) => (
              <Card key={item.id ?? item._id ?? `related-${index}`} className="p-4">
                <Link href={paths.product(item.id ?? item._id)}>
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