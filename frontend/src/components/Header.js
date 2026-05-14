"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useSiteSettings } from "../context/SiteSettingsContext";
import SearchBox from "./SearchBox";
import dynamic from "next/dynamic";
import { Suspense } from "react";
const MegaMenu = dynamic(() => import("./MegaMenu"), { ssr: false });
import MobileMenu from "./MobileMenu";
import { normalizeLogoUrl } from "../lib/images";
import { getAbsoluteApiUrl } from "../lib/api";

const FALLBACK_CATEGORIES = [
  { id: "fallback-1", _id: "fallback-1", name: "Cam Sanat Eserleri", description: "El yapımı cam sanat eserleri", productCount: 0 },
  { id: "fallback-2", _id: "fallback-2", name: "Dekoratif Ürünler", description: "Özgün dekoratif cam ürünleri", productCount: 0 },
  { id: "fallback-3", _id: "fallback-3", name: "Hediyelik Eşya", description: "Özel günler için cam hediyelik eşyalar", productCount: 0 }
];

export default function Header() {
  const { user, logout } = useAuth();
  const { items } = useCart();
  const count = items.reduce((sum, i) => sum + (Number.isFinite(i.quantity) ? i.quantity : 0), 0);
  const settings = useSiteSettings();

  const { logoUrl, siteName, initials, hasCustomLogo } = useMemo(() => {
    const name = settings.general?.siteName || "Anadolu Feneri Cam Sanat Merkezi";
    const url = normalizeLogoUrl(settings.general?.logoUrl);
    const isPlaceholder = !url || url === "/images/logo-placeholder.png";
    return {
      logoUrl: url,
      siteName: name,
      initials: name.slice(0, 2).toUpperCase(),
      hasCustomLogo: !isPlaceholder
    };
  }, [settings.general?.logoUrl, settings.general?.siteName]);
  
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCategories() {
      try {
        const res = await fetch(getAbsoluteApiUrl("/api/categories?all=true"), {
          cache: "no-store"
        });
        if (!res.ok) throw new Error("Kategori listesi alınamadı");
        const data = await res.json();
        if (!cancelled) {
          setCategories(Array.isArray(data) ? data : data.items || []);
        }
      } catch (error) {
        console.error("Header categories load error:", error);
      } finally {
        if (!cancelled) {
          setCategoriesLoaded(true);
        }
      }
    }
    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const menuCategories = categories.length > 0 || categoriesLoaded ? categories : FALLBACK_CATEGORIES;

  return (
    <header className="site-chrome-header shadow-sm border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 theme-logo-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 overflow-hidden">
              {hasCustomLogo ? (
                <Image
                  src={logoUrl}
                  alt={siteName || "Site logosu"}
                  width={40}
                  height={40}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              ) : (
                <span className="text-white font-bold text-lg" suppressHydrationWarning>
                  {initials}
                </span>
              )}
            </div>
            <span
              className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors duration-200 whitespace-nowrap leading-tight"
              suppressHydrationWarning
            >
              {siteName}
            </span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-lg mx-8">
            <SearchBox />
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200 relative group">
              Anasayfa
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <MegaMenu categories={menuCategories} />
            <Link href="/campaigns" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200 relative group">
              Kampanyalar
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link href="/search" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200 relative group">
              Arama
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link href="/about" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200 relative group">
              Hakkımızda
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link href="/contact" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200 relative group">
              İletişim
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-200 group-hover:w-full"></span>
            </Link>
          </nav>

          {/* Mobile Menu */}
          <MobileMenu categories={menuCategories} />

          {/* User Actions */}
          <div className="flex items-center space-x-2">
            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label="Favorilerim"
              className="p-3 text-slate-700 hover:text-primary transition-all duration-200 relative rounded-lg hover:bg-slate-50 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Sepetim"
              className="p-3 text-slate-700 hover:text-primary transition-all duration-200 relative rounded-lg hover:bg-slate-50 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs px-2 py-1 rounded-full min-w-[20px] text-center font-medium shadow-lg animate-bounce-gentle" data-testid="cart-count">
                  {count}
                </span>
              )}
            </Link>

            {/* User Menu */}
            {user ? (
              <div className="relative group">
                <button className="flex items-center space-x-3 p-2 text-slate-700 hover:text-primary transition-all duration-200 rounded-lg hover:bg-slate-50">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-dark rounded-full flex items-center justify-center shadow-md">
                    <span className="text-sm font-bold text-white">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-900">{user.name || 'Kullanıcı'}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <Link href="/profile" className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profil
                    </Link>
                    <Link href="/orders" className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Siparişlerim
                    </Link>
                    {user && user.role === 'admin' && (
                      <Link href="/admin" className="flex items-center px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors">
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Admin Panel
                      </Link>
                    )}
                    <hr className="my-2" />
                    <button
                      onClick={logout}
                      className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Çıkış Yap
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200">
                  Giriş
                </Link>
                <Link href="/register" className="btn-primary">
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}