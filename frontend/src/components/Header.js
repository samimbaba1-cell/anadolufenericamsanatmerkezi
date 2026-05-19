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
import UserAccountMenu from "./UserAccountMenu";
import { normalizeLogoUrl } from "../lib/images";
import { asArray, asDisplayString } from "../lib/safeString";
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
    const name = asDisplayString(
      settings.general?.siteName,
      "Anadolu Feneri Cam Sanat Merkezi"
    );
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
        const data = res.ok ? await res.json().catch(() => []) : [];
        if (!cancelled) {
          setCategories(asArray(data));
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
    <header className="site-chrome-header shadow-sm border-b border-border sticky top-0 z-50 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex items-center justify-between gap-3 h-14 sm:h-16 min-w-0">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0 max-w-[48%] md:max-w-none">
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 theme-logo-gradient rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105 overflow-hidden">
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
              className="font-bold text-foreground group-hover:text-primary transition-colors duration-200 leading-tight text-xs sm:text-sm md:text-base lg:text-lg md:whitespace-nowrap"
              suppressHydrationWarning
              title={siteName}
            >
              {siteName}
            </span>
          </Link>

          <div className="hidden md:flex flex-1 justify-center px-4 lg:px-8 min-w-[240px] max-w-2xl">
            <SearchBox />
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
            <MobileMenu categories={menuCategories} />
            {/* Wishlist */}
            <Link
              href="/wishlist"
              aria-label="Favorilerim"
              className="p-2 sm:p-3 text-slate-700 hover:text-primary transition-all duration-200 relative rounded-lg hover:bg-slate-50 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              aria-label="Sepetim"
              className="p-2 sm:p-3 text-slate-700 hover:text-primary transition-all duration-200 relative rounded-lg hover:bg-slate-50 group"
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

            {user ? (
              <UserAccountMenu user={user} onLogout={logout} />
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/login" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200">
                  Giriş
                </Link>
                <Link href="/register" className="btn-primary text-sm px-4 py-2">
                  Kayıt Ol
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Masaüstü menü — ikinci satır */}
        <nav className="hidden md:flex items-center justify-center flex-wrap gap-x-5 lg:gap-x-8 gap-y-1 pb-3 pt-0.5 border-t border-border/40 text-sm lg:text-base">
          <Link href="/" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200">
            Anasayfa
          </Link>
          <MegaMenu categories={menuCategories} />
          <Link href="/campaigns" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200">
            Kampanyalar
          </Link>
          <Link href="/about" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200">
            Hakkımızda
          </Link>
          <Link href="/contact" className="text-slate-700 hover:text-primary font-medium transition-colors duration-200">
            İletişim
          </Link>
        </nav>

        {/* Mobil arama */}
        <div className="md:hidden pb-3 pt-1 w-full min-w-0">
          <SearchBox variant="large" />
        </div>
      </div>
    </header>
  );
}