"use client";
import { useRef, useState } from "react";
import Link from "next/link";

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
    }, 180);
  };

  return (
    <div
      className="relative group"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <Link
        href="/categories"
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

      {isOpen && (
        <div
          className="absolute top-full left-0 w-screen max-w-4xl bg-white shadow-xl border border-slate-200 rounded-lg z-50"
          onMouseEnter={openMenu}
          onMouseLeave={scheduleClose}
        >
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.slice(0, 9).map((category) => (
                <Link
                  key={category._id}
                  href={`/categories?category=${category._id}`}
                  className="group flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-primary transition-colors">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-2">
                      {category.productCount || 0} ürün
                    </p>
                  </div>
                </Link>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t border-slate-200">
              <Link
                href="/categories"
                className="flex items-center justify-center w-full py-3 px-4 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
              >
                Tüm Kategorileri Gör
                <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MegaMenu;
