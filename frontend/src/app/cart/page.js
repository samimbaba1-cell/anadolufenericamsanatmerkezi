"use client";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { apiFetch } from "../../lib/api";
import { resolveMediaUrl } from "../../lib/images";
import { routes, productPath } from "../../lib/routes";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function CartPage() {
  const { items, updateQuantity, removeItem } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const normalizedItems = items.map((item) => {
    const data = item.productData || {};
    const categoryName =
      data.category?.name ||
      (Array.isArray(data.categories) ? data.categories.map(c => c.name).join(", ") : item.category) ||
      "Genel";
    const price = Number(data.price ?? item.price ?? 0);
    const image = resolveMediaUrl(data.images?.[0] || item.image);
    return {
      id: item.product || item.id || item._id,
      quantity: item.quantity || 0,
      name: data.name || item.name || "Ürün",
      price,
      image,
      category: categoryName
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const shipping = subtotal > 500 ? 0 : 25; // Free shipping over 500 TL
  const total = subtotal + shipping;

  const handleQuantityChange = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeItem(productId);
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (!user) {
      // Redirect to login
      window.location.href = routes.login;
      return;
    }
    // Redirect to checkout
    window.location.href = routes.checkout;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <LoadingSkeleton />
        </div>
      </div>
    );
  }

  if (normalizedItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="mx-auto h-24 w-24 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sepetiniz boş</h3>
            <p className="mt-1 text-sm text-gray-500">Alışverişe başlamak için ürünleri inceleyin.</p>
            <div className="mt-6">
              <Link href="/">
                <Button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Alışverişe Başla
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Alışveriş Sepeti</h1>
            
            <div className="flow-root">
              <ul className="-my-6 divide-y divide-gray-200">
                {normalizedItems.map((item) => (
                  <li key={item.id} className="py-6 flex">
                    <div className="flex-shrink-0 w-24 h-24 border border-gray-200 rounded-md overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name || "Ürün görseli"}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover object-center"
                        unoptimized
                      />
                    </div>

                    <div className="ml-4 flex-1 flex flex-col">
                      <div>
                        <div className="flex justify-between text-base font-medium text-gray-900">
                          <h3>
                            <Link href={productPath(item.id)} className="hover:text-blue-600">
                              {item.name}
                            </Link>
                          </h3>
                          <p className="ml-4 text-blue-600 font-semibold">
                            ₺{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{item.category}</p>
                      </div>
                      <div className="mt-4 flex-1 flex items-end justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            data-testid="decrease-quantity"
                            data-product-id={item.id}
                          >
                            <span className="text-gray-500">-</span>
                          </button>
                          <span
                            className="w-8 text-center text-sm font-medium"
                            data-testid="cart-quantity"
                            data-product-id={item.id}
                          >
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                            data-testid="increase-quantity"
                            data-product-id={item.id}
                          >
                            <span className="text-gray-500">+</span>
                          </button>
                        </div>

                        <div className="flex">
                          <button
                            onClick={() => removeItem(item.id)}
                            className="font-medium text-red-600 hover:text-red-500"
                            data-testid="remove-from-cart"
                            data-product-id={item.id}
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
            <div className="flex justify-between text-base font-medium text-gray-900">
              <p>Toplam</p>
              <p>₺{total.toFixed(2)}</p>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {shipping === 0 ? "Ücretsiz kargo" : `Kargo: ₺${shipping.toFixed(2)}`}
            </p>
            <div className="mt-6">
              <Button
                onClick={handleCheckout}
                className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Ödemeye Geç
              </Button>
            </div>
            <div className="mt-6 flex justify-center text-sm text-gray-500">
              <Link href="/" className="font-medium text-blue-600 hover:text-blue-500">
                Alışverişe devam et
                <span aria-hidden="true"> &rarr;</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}