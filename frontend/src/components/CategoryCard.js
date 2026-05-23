"use client";
import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "../lib/images";
import { getCategoryHref } from "../lib/categoryUrl";

const CategoryCard = ({ category, className = "", isActive = false, compact = false }) => {
  const { name, description, image, productCount = 0 } = category;
  const categoryId = category.id || category._id;
  const imageUrl = resolveMediaUrl(image, null);

  if (!categoryId) return null;

  const imageHeight = compact ? "h-32" : "h-48";

  return (
    <Link
      href={getCategoryHref(category)}
      scroll={true}
      className={`group block cursor-pointer rounded-xl transition-shadow ${
        isActive ? "ring-2 ring-primary ring-offset-2 shadow-md" : ""
      } ${className}`}
    >
      <div className="card-modern card-hover overflow-hidden h-full">
        <div className={`relative ${imageHeight} bg-gradient-to-br from-slate-100 to-slate-200`}>
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
              <span className={`font-bold text-primary ${compact ? "text-2xl" : "text-4xl"}`}>
                {(name || "?").charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs sm:text-sm font-medium text-slate-700">
            {productCount} ürün
          </div>
        </div>

        <div className={compact ? "p-3" : "card-modern-body"}>
          <h3
            className={`font-semibold text-foreground group-hover:text-primary transition-colors ${
              compact ? "text-base line-clamp-1" : "text-xl mb-2"
            }`}
          >
            {name}
          </h3>
          {!compact && description && (
            <p className="text-slate-600 text-sm line-clamp-2">{description}</p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
