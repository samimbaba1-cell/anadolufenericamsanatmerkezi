"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import Image from "next/image";
import { resolveMediaUrl } from "../lib/images";
import { getCategoryHref } from "../lib/categoryUrl";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale } from "../context/LocaleContext";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";

export default function MobileMenu({ categories = [] }) {
  const { routes, locale, t } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();
  const { items: cartItems } = useCart();
  const { ids: wishlistIds } = useWishlist();

  const cartCount = cartItems.reduce(
    (sum, item) => sum + (Number.isFinite(item.quantity) ? item.quantity : 0),
    0
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);
  const openMenu = () => setIsOpen(true);

  const drawer = isOpen ? (
    <div className="fixed inset-0 z-[9998] md:hidden" role="dialog" aria-modal="true" aria-label="Mobil menü">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Menüyü kapat"
        onClick={closeMenu}
      />

      <div className="absolute top-0 right-0 flex h-[100dvh] w-[min(20rem,100vw)] max-w-full flex-col bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{t("nav.menu")}</h2>
          <LanguageSwitcher />
          <button
            type="button"
            onClick={closeMenu}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            aria-label="Kapat"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="space-y-1">
            <Link
              href={routes.home}
              onClick={closeMenu}
              className="flex items-center rounded-lg p-3 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
            >
              {t("nav.home")}
            </Link>
            <Link
              href={routes.categories}
              onClick={closeMenu}
              className="flex items-center rounded-lg p-3 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
            >
              {t("nav.categories")}
            </Link>
            <Link
              href={routes.campaigns}
              onClick={closeMenu}
              className="flex items-center rounded-lg p-3 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
            >
              {t("nav.campaigns")}
            </Link>
            <Link
              href={routes.about}
              onClick={closeMenu}
              className="flex items-center rounded-lg p-3 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
            >
              {t("nav.about")}
            </Link>
            <Link
              href={routes.contact}
              onClick={closeMenu}
              className="flex items-center rounded-lg p-3 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
            >
              {t("nav.contact")}
            </Link>
            <Link
              href={routes.search}
              onClick={closeMenu}
              className="flex items-center rounded-lg p-3 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
            >
              {t("nav.search")}
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                {t("nav.popularCategories")}
              </p>
              <div className="space-y-1">
                {categories.slice(0, 8).map((category, index) => {
                  const categoryId = category.id || category._id || `category-${index}`;
                  const imageUrl = resolveMediaUrl(category.image, null);
                  return (
                    <Link
                      key={categoryId}
                      href={getCategoryHref(category, locale)}
                      onClick={closeMenu}
                      className="flex items-center gap-3 rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                        {imageUrl ? (
                          <Image
                            src={imageUrl}
                            alt={category.name}
                            fill
                            className="object-cover"
                            sizes="40px"
                            unoptimized
                          />
                        ) : (
                          <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-primary">
                            {(category.name || "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className="truncate">{category.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </nav>

        <div className="shrink-0 border-t border-gray-200 p-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary">
                  <span className="text-sm font-medium text-white">
                    {user.name?.charAt(0)?.toUpperCase() ||
                      user.firstName?.charAt(0)?.toUpperCase() ||
                      user.email?.charAt(0)?.toUpperCase() ||
                      "U"}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {user.name || (user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : user.email)}
                  </p>
                  <p className="truncate text-xs text-gray-500">{user.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Link
                  href={routes.profile}
                  onClick={closeMenu}
                  className="rounded-lg p-2 text-center text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("nav.profile")}
                </Link>
                <Link
                  href={routes.orders}
                  onClick={closeMenu}
                  className="rounded-lg p-2 text-center text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("nav.orders")}
                </Link>
                <Link
                  href={routes.wishlist}
                  onClick={closeMenu}
                  className="relative rounded-lg p-2 text-center text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("nav.wishlist")}
                  {wishlistIds.length > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      {wishlistIds.length}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href={routes.cart}
                  onClick={closeMenu}
                  className="relative rounded-lg p-2 text-center text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("nav.cart")}
                  {cartCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                      {cartCount}
                    </span>
                  ) : null}
                </Link>
              </div>

              {user.role === "admin" ? (
                <Link
                  href="/admin"
                  onClick={closeMenu}
                  className="block rounded-lg p-2 text-center text-sm text-gray-700 hover:bg-gray-100"
                >
                  {t("nav.admin")}
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  logout();
                  closeMenu();
                }}
                className="w-full rounded-lg p-2 text-sm text-red-600 hover:bg-red-50"
              >
                {t("nav.logout")}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Link href={routes.login} onClick={closeMenu} className="btn-primary block w-full text-center">
                {t("nav.login")}
              </Link>
              <Link href={routes.register} onClick={closeMenu} className="btn-secondary block w-full text-center">
                {t("nav.register")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 md:hidden"
        aria-label="Menüyü aç"
        aria-expanded={isOpen}
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {mounted && drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
