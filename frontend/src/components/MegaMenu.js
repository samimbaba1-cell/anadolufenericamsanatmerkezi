"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "../lib/images";
import { getCategoryHref } from "../lib/categoryUrl";
import { routes } from "../lib/routes";

const MegaMenu = ({ categories = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeTimerRef = useRef(null);

  const openMenu = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimerRef.current = null;
    }, 320);
  };

  const closeNow = () => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <Link
        href={routes.categories}
        onMouseEnter={openMenu}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center space-x-1 text-slate-700 hover:text-primary font-medium transition-colors duration-200 relative"
      >
        <span>Kategoriler</span>
        <svg className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Link>

      <div
        className={`absolute top-full left-0 pt-1 w-screen max-w-4xl z-[100] transition-opacity duration-150 ${
          isOpen ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
        }`}
        onMouseEnter={openMenu}
        onMouseLeave={scheduleClose}
      >
        <div className="bg-white shadow-xl border border-slate-200 rounded-lg">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.slice(0, 9).map((category, index) => {
                const categoryId = category.id || category._id || `category-${index}`;
                const imageUrl = resolveMediaUrl(category.image, null);
                const href = getCategoryHref(category);
                return (
                  <Link
                    key={categoryId}
                    href={href}
                    prefetch={false}
                    onClick={closeNow}
                    className="group flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                  >
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0">
                      {imageUrl ? (
                        <Image
                          src={imageUrl}
                          alt={category.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="64px"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-secondary/20">
                          <span className="text-lg font-bold text-primary">
                            {(category.name || "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {category.name}
                      </h3>
                      {category.description && (
                        <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                          {category.description}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        {category.productCount || 0} ürün
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <Link
                href={routes.categories}
                onClick={closeNow}
                className="flex items-center justify-center w-full py-3 px-4 bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
              >
                Tüm Kategorileri Gör
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MegaMenu;
