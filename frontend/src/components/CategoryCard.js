"use client";
import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "../lib/images";

const CategoryCard = ({ category, className = "" }) => {
  const { name, description, image, productCount = 0 } = category;
  const categoryId = category.id || category._id;
  const imageUrl = resolveMediaUrl(image, null);

  if (!categoryId) return null;

  return (
    <Link href={`/categories?category=${categoryId}`} className={`group block ${className}`}>
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
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/20">
              <span className="text-4xl font-bold text-primary">
                {(name || "?").charAt(0).toUpperCase()}
              </span>
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
          <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
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
