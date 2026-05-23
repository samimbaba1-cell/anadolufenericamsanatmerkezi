/**
 * Mağaza sayfa yolları — adres çubuğunda Türkçe URL (SEO).
 * Eski İngilizce yollar next.config redirects ile buraya yönlenir.
 */
export const routes = {
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
  paymentCallback: "/odeme/callback",
  admin: "/admin"
};

export function categoryPath(slug) {
  if (!slug) return routes.categories;
  return `${routes.categories}/${slug}`;
}

export function productPath(id) {
  return `/urun/${id}`;
}

export function orderPath(id) {
  return id ? `${routes.orders}/${id}` : routes.orders;
}
