"use client";
import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { useSiteContent } from "../context/SiteContentContext";
import { asDisplayString } from "../lib/safeString";
import { normalizeLogoUrl } from "../lib/images";
import { useLocale } from "../context/LocaleContext";

const SOCIAL_ICONS = {
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 11-2.881.001 1.44 1.44 0 012.881-.001z" />
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.4c-.966 0-1.75-.79-1.75-1.767 0-.977.784-1.767 1.75-1.767s1.75.79 1.75 1.767c0 .977-.784 1.767-1.75 1.767zm13.5 11.4h-3v-5.604c0-1.336-.025-3.055-1.861-3.055-1.861 0-2.148 1.454-2.148 2.954v5.705h-3v-10h2.879v1.367h.041c.401-.761 1.379-1.563 2.84-1.563 3.039 0 3.602 2.001 3.602 4.604v5.592z" />
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M23.499 6.203a2.997 2.997 0 00-2.112-2.12C19.281 3.5 12.041 3.5 12.041 3.5s-7.24 0-9.346.583a2.997 2.997 0 00-2.112 2.12A31.577 31.577 0 000 12a31.58 31.58 0 00.542 5.797 2.997 2.997 0 002.112 2.12c2.106.583 9.346.583 9.346.583s7.24 0 9.346-.583a2.997 2.997 0 002.112-2.12A31.58 31.58 0 0024 12a31.577 31.577 0 00-.501-5.797zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
};

const SOCIAL_BUTTON_CLASS = {
  facebook: "bg-[#1877F2] text-white hover:brightness-110",
  instagram:
    "bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white hover:brightness-110 shadow-md",
  twitter: "bg-black text-white hover:bg-slate-900",
  linkedin: "bg-[#0A66C2] text-white hover:brightness-110",
  youtube: "bg-[#FF0000] text-white hover:brightness-110"
};

const SOCIAL_LABELS = {
  facebook: "Facebook",
  instagram: "Instagram",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube"
};

export default function Footer() {
  const { routes, t } = useLocale();
  const settings = useSiteSettings();
  const { content: siteContent } = useSiteContent();
  const siteName = asDisplayString(
    settings.general?.siteName,
    "Anadolu Feneri Cam Sanat Merkezi"
  );
  const { logoUrl, initials, hasCustomLogo } = useMemo(() => {
    const url = normalizeLogoUrl(settings.general?.logoUrl);
    const isPlaceholder = !url || url === "/images/logo-placeholder.png";
    return {
      logoUrl: url,
      initials: siteName.slice(0, 2).toUpperCase(),
      hasCustomLogo: !isPlaceholder
    };
  }, [settings.general?.logoUrl, siteName]);
  const siteDescription =
    settings.general?.siteDescription ||
    "Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat ile alışverişin keyfini çıkarın.";
  const settingsContact = settings.contact || {};
  const contentContact = siteContent.contact || {};
  const social = settings.social || {};

  const contactAddress =
    contentContact.address || settingsContact.address || "İstanbul, Türkiye";
  const contactPhone =
    contentContact.phone || settingsContact.phone || "+90 (212) 555-0123";
  const contactEmail =
    contentContact.email || settingsContact.email || "info@anadolufenericamsanatmerkezi.com";
  const wh = contentContact.workingHours || {};
  const supportHours =
    [wh.weekdays, wh.saturday, wh.sunday].filter(Boolean).join(" · ") ||
    settingsContact.supportHours ||
    "";

  const socialEntries = Object.entries(SOCIAL_ICONS)
    .map(([key, icon]) => ({
      key,
      url: social[key],
      icon
    }))
    .filter(item => Boolean(item.url));

  return (
    <footer className="theme-footer text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo ve Açıklama */}
          <div className="lg:col-span-1">
            <Link href={routes.home} className="flex items-center space-x-3 mb-4 group">
              <div className="w-10 h-10 theme-logo-gradient rounded-xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                {hasCustomLogo ? (
                  <Image
                    src={logoUrl}
                    alt={siteName}
                    width={40}
                    height={40}
                    className="object-cover w-full h-full"
                    unoptimized
                  />
                ) : (
                  <span className="text-white font-bold text-lg">{initials}</span>
                )}
              </div>
              <span className="text-2xl font-bold group-hover:text-primary transition-colors">{siteName}</span>
            </Link>
            <p className="text-slate-300 mb-6 leading-relaxed">{siteDescription}</p>
            <div className="flex space-x-4">
              {socialEntries.length > 0 ? (
                socialEntries.map(item => (
                  <a
                    key={item.key}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_LABELS[item.key] || item.key}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      SOCIAL_BUTTON_CLASS[item.key] ||
                      "bg-slate-700 text-white hover:bg-primary"
                    }`}
                  >
                    {item.icon}
                  </a>
                ))
              ) : (
                <span className="text-sm text-slate-500">{t("footer.noSocial")}</span>
              )}
            </div>
          </div>

          {/* Hızlı Linkler */}
          <div>
            <h3 className="text-lg font-semibold mb-6">{t("footer.quickLinks")}</h3>
            <ul className="space-y-3">
              <li><Link href={routes.home} className="text-slate-300 hover:text-white transition-colors">{t("nav.home")}</Link></li>
              <li><Link href={routes.categories} className="text-slate-300 hover:text-white transition-colors">{t("nav.categories")}</Link></li>
              <li><Link href={routes.search} className="text-slate-300 hover:text-white transition-colors">{t("nav.search")}</Link></li>
              <li><Link href={routes.cart} className="text-slate-300 hover:text-white transition-colors">{t("nav.cart")}</Link></li>
              <li><Link href={routes.wishlist} className="text-slate-300 hover:text-white transition-colors">{t("nav.wishlist")}</Link></li>
            </ul>
          </div>

          {/* Müşteri Hizmetleri */}
          <div>
            <h3 className="text-lg font-semibold mb-6">{t("footer.customerService")}</h3>
            <ul className="space-y-3">
              <li><Link href={routes.orders} className="text-slate-300 hover:text-white transition-colors">{t("nav.orders")}</Link></li>
              <li><Link href={routes.profile} className="text-slate-300 hover:text-white transition-colors">{t("nav.profile")}</Link></li>
              <li><Link href={routes.contact} className="text-slate-300 hover:text-white transition-colors">{t("nav.contact")}</Link></li>
              <li><Link href={routes.faq} className="text-slate-300 hover:text-white transition-colors">{t("footer.faq")}</Link></li>
              <li><Link href={routes.returns} className="text-slate-300 hover:text-white transition-colors">{t("footer.returns")}</Link></li>
            </ul>
          </div>

          {/* İletişim Bilgileri */}
          <div>
            <h3 className="text-lg font-semibold mb-6">{t("footer.contact")}</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-primary mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-slate-300">{contactAddress}</p>
                  {supportHours && <p className="text-slate-400 text-sm">{supportHours}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <p className="text-slate-300">{contactPhone}</p>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-300">{contactEmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alt Kısım */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} {siteName}. {t("footer.rights")}
            </div>
            <div className="flex space-x-6 text-sm">
              <Link href={routes.privacy} className="text-slate-400 hover:text-white transition-colors">{t("footer.privacy")}</Link>
              <Link href={routes.terms} className="text-slate-400 hover:text-white transition-colors">{t("footer.terms")}</Link>
              <Link href={routes.cookies} className="text-slate-400 hover:text-white transition-colors">{t("footer.cookies")}</Link>
            </div>
          </div>
          
          {/* Ödeme Yöntemleri */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-slate-400 text-sm mb-4">{t("footer.paymentMethods")}</p>
            <div className="flex flex-wrap gap-4">
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">VISA</span>
              </div>
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-red-600">MC</span>
              </div>
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-blue-800">AMEX</span>
              </div>
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">PP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
