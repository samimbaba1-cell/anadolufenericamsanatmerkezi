"use client";
import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "../lib/images";

const CategoryCard = ({ category, className = "" }) => {
  const { _id, name, description, image, productCount = 0 } = category;
  const imageUrl = resolveMediaUrl(image, null);
  
  return (
    <Link href={`/categories?category=${_id}`} className={`group block ${className}`}>
      <div className="card-modern card-hover overflow-hidden">
        <div className="relative h-48 bg-gradient-to-br from-slate-100 to-slate-200">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name || "Kategori görseli"}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <p className="text-slate-500 text-sm">Kategori Resmi</p>
              </div>
            </div>
          )}
          
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          {/* Ürün Sayısı */}
          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-sm font-medium text-slate-700">
            {productCount} ürün
          </div>
        </div>
        
        <div className="card-modern-body">
          <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-primary transition-colors">
            {name}
          </h3>
          {description && (
            <p className="text-slate-600 text-sm line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
