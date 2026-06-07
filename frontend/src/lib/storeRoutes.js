/** Mağaza rotaları — locale'e göre URL (TR: Türkçe slug, EN: /en/...) */

const TR = {
  home: "/",
  categories: "/kategoriler",
  about: "/hakkimizda",
  contact: "/iletisim",
  faq: "/sik-sorulan-sorular",
  campaigns: "/kampanyalar",
  cart: "/sepet",
  wishlist: "/favoriler",
  checkout: "/odeme",
  login: "/giris",
  register: "/kayit",
  search: "/ara",
  orders: "/siparislerim",
  profile: "/hesabim",
  returns: "/iade-degisim",
  privacy: "/gizlilik-politikasi",
  terms: "/kullanim-kosullari",
  cookies: "/cerez-politikasi",
  forgotPassword: "/sifremi-unuttum",
  resetPassword: "/sifre-sifirla",
  verifyEmail: "/e-posta-dogrula",
  paymentSuccess: "/odeme/basarili",
  paymentError: "/odeme/hata",
  paymentCallback: "/odeme/callback"
};

const EN = {
  home: "/en",
  categories: "/en/categories",
  about: "/en/about",
  contact: "/en/contact",
  faq: "/en/faq",
  campaigns: "/en/campaigns",
  cart: "/en/cart",
  wishlist: "/en/wishlist",
  checkout: "/en/checkout",
  login: "/en/login",
  register: "/en/register",
  search: "/en/search",
  orders: "/en/orders",
  profile: "/en/profile",
  returns: "/en/returns",
  privacy: "/en/privacy-policy",
  terms: "/en/terms-of-use",
  cookies: "/en/cookie-policy",
  forgotPassword: "/en/forgot-password",
  resetPassword: "/en/reset-password",
  verifyEmail: "/en/verify-email",
  paymentSuccess: "/en/payment/success",
  paymentError: "/en/payment/error",
  paymentCallback: "/en/payment/callback"
};

/** Eski routes.js ile uyumluluk — varsayılan TR */
export const routes = TR;

export function getStoreRoutes(locale = "tr") {
  return locale === "en" ? EN : TR;
}

export function categoryPath(slug, locale = "tr") {
  const base = getStoreRoutes(locale).categories;
  return slug ? `${base}/${slug}` : base;
}

export function productPath(id, locale = "tr") {
  const prefix = locale === "en" ? "/en/product" : "/urun";
  return `${prefix}/${id}`;
}

export function orderPath(id, locale = "tr") {
  const base = getStoreRoutes(locale).orders;
  return id ? `${base}/${id}` : base;
}

export function searchPath(query, locale = "tr") {
  const base = getStoreRoutes(locale).search;
  if (!query) return base;
  return `${base}?q=${encodeURIComponent(query)}`;
}

/** İç sayfa yolu (rewrite sonrası) → locale'e göre halka açık URL */
const INTERNAL_TO_KEY = {
  "/": "home",
  "/about": "about",
  "/categories": "categories",
  "/contact": "contact",
  "/faq": "faq",
  "/campaigns": "campaigns",
  "/cart": "cart",
  "/wishlist": "wishlist",
  "/checkout": "checkout",
  "/login": "login",
  "/register": "register",
  "/search": "search",
  "/orders": "orders",
  "/profile": "profile",
  "/returns": "returns",
  "/privacy-policy": "privacy",
  "/terms-of-use": "terms",
  "/cookie-policy": "cookies",
  "/forgot-password": "forgotPassword",
  "/reset-password": "resetPassword",
  "/verify-email": "verifyEmail",
  "/payment/success": "paymentSuccess",
  "/payment/error": "paymentError",
  "/payment/callback": "paymentCallback"
};

const TR_PUBLIC_TO_INTERNAL = {
  "/hakkimizda": "/about",
  "/kategoriler": "/categories",
  "/iletisim": "/contact",
  "/sik-sorulan-sorular": "/faq",
  "/kampanyalar": "/campaigns",
  "/sepet": "/cart",
  "/favoriler": "/wishlist",
  "/odeme": "/checkout",
  "/giris": "/login",
  "/kayit": "/register",
  "/ara": "/search",
  "/siparislerim": "/orders",
  "/hesabim": "/profile",
  "/iade-degisim": "/returns",
  "/gizlilik-politikasi": "/privacy-policy",
  "/kullanim-kosullari": "/terms-of-use",
  "/cerez-politikasi": "/cookie-policy",
  "/sifremi-unuttum": "/forgot-password",
  "/sifre-sifirla": "/reset-password",
  "/e-posta-dogrula": "/verify-email",
  "/odeme/basarili": "/payment/success",
  "/odeme/hata": "/payment/error",
  "/odeme/callback": "/payment/callback"
};

export function pathnameToInternal(pathname) {
  if (!pathname) return "/";
  let p = pathname.split("?")[0];
  if (p.endsWith("/") && p.length > 1) p = p.slice(0, -1);

  if (p.startsWith("/en")) {
    const rest = p.slice(3) || "/";
    return rest === "" ? "/" : rest;
  }

  if (TR_PUBLIC_TO_INTERNAL[p]) return TR_PUBLIC_TO_INTERNAL[p];

  if (p.startsWith("/kategoriler/")) {
    return `/categories${p.slice("/kategoriler".length)}`;
  }
  if (p.startsWith("/urun/")) {
    return `/product${p.slice("/urun".length)}`;
  }
  if (p.startsWith("/siparislerim/")) {
    return `/orders${p.slice("/siparislerim".length)}`;
  }

  return p;
}

export function localizedPathFromPathname(pathname, targetLocale) {
  const internal = pathnameToInternal(pathname);
  const routesMap = getStoreRoutes(targetLocale);

  if (internal.startsWith("/categories/")) {
    return `${routesMap.categories}${internal.slice("/categories".length)}`;
  }
  if (internal.startsWith("/product/")) {
    return productPath(internal.slice("/product/".length), targetLocale);
  }
  if (internal.startsWith("/orders/")) {
    return orderPath(internal.slice("/orders/".length), targetLocale);
  }

  const key = INTERNAL_TO_KEY[internal];
  if (key && routesMap[key]) return routesMap[key];

  return targetLocale === "en" ? `/en${internal === "/" ? "" : internal}` : internal;
}
