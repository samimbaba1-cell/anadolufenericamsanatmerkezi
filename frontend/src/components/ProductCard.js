"use client";
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import Card from './ui/Card';
import Button from './ui/Button';
import AddToCartButton from './AddToCartButton';
import { resolveMediaUrl } from '../lib/images';
import { useLocale } from '../context/LocaleContext';

const ProductCard = ({ product, className = '' }) => {
  const { paths, t } = useLocale();
  const { _id, name, price, images, ratingAvg = 0, ratingCount = 0, stock = 0 } = product;
  const href = paths.product(_id);
  const primaryImage = resolveMediaUrl(images?.[0]);
  
  const isOutOfStock = stock <= 0;
  
  return (
    <div className={`group card-modern card-hover ${className}`} data-testid="product-card">
      <Link href={href} className="block" data-testid="product-link">
        <div className="relative aspect-square bg-gradient-to-br from-slate-50 to-slate-100 rounded-t-xl overflow-hidden">
          {images && images[0] ? (
            <Image
              src={primaryImage}
              alt={name || "Ürün görseli"}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-slate-500">Resim Yok</p>
              </div>
            </div>
          )}
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Stock Badge */}
          {isOutOfStock && (
            <div className="absolute top-3 right-3 bg-red-500 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg">
              {t("common.soldOut")}
            </div>
          )}
          
          {/* Wishlist Button */}
          <button className="absolute top-3 left-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white hover:scale-110">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          
          {/* Quick Add Button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              <AddToCartButton 
                productId={_id} 
                productData={product}
                disabled={isOutOfStock}
                className="btn-primary shadow-lg hover:shadow-xl"
                data-testid="add-to-cart"
              />
            </div>
          </div>
        </div>
      </Link>
      
      <div className="card-modern-body space-y-3">
        <Link href={href}>
          <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition-colors duration-200 text-lg">
            {name}
          </h3>
        </Link>
        
        {/* Rating */}
        {ratingCount > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(ratingAvg) ? 'text-yellow-400' : 'text-slate-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-sm text-slate-500 font-medium">({ratingCount})</span>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-foreground">
            ₺{Number(price || 0).toFixed(2)}
          </div>
          
          {!isOutOfStock && (
            <div className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {stock} adet
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
