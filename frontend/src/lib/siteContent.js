import { getApiBaseUrl } from "./api-base";
import { getAbsoluteApiUrl } from "./api";

export const DEFAULT_ABOUT = {
  title: "Hakkımızda",
  heroTitle: "Hakkımızda",
  heroSubtitle:
    "Anadolu Feneri Cam Sanat Merkezi olarak, el işçiliğine ve müşteri memnuniyetine odaklanarak özgün cam sanat eserleri sunuyoruz.",
  mission:
    "Müşterilerimize en kaliteli ürünleri en uygun fiyatlarla sunarak, alışveriş deneyimlerini kolaylaştırmak ve memnuniyetlerini sağlamak.",
  vision: "Teknoloji ve müşteri hizmetlerindeki yeniliklerle sektörde öncü olmaya devam ediyoruz.",
  missionImageUrl: "",
  companyImageUrl: "",
  companyInfo: {
    founded: "2020",
    location: "İstanbul, Türkiye",
    expertise: "Cam ürünler ve özel tasarımlar",
    customers: "10,000+"
  },
  values: [
    { title: "Kalite", description: "El yapımı cam ürünlerde titiz işçilik.", iconUrl: "" },
    { title: "Güven", description: "Şeffaf fiyatlandırma ve güvenli ödeme.", iconUrl: "" },
    { title: "Sanat", description: "Geleneksel cam sanatını modern tasarımla buluşturuyoruz.", iconUrl: "" }
  ],
  cta: {
    title: "Bizimle İletişime Geçin",
    subtitle: "Sorularınız için müşteri hizmetlerimiz yanınızda",
    primaryLabel: "İletişim Sayfası",
    primaryLink: "/iletisim",
    secondaryLabel: "Ürünlerimizi İncele",
    secondaryLink: "/products"
  }
};

export const DEFAULT_TESTIMONIALS = [
  {
    name: "Ayşe K.",
    role: "Müşteri",
    content: "El yapımı cam ürünler harika, paketleme çok özenliydi.",
    rating: 5,
    avatarUrl: ""
  }
];

export const DEFAULT_CONTACT = {
  title: "İletişim",
  heroTitle: "İletişim",
  heroSubtitle: "Sorularınız, önerileriniz veya destek talepleriniz için bizimle iletişime geçin.",
  email: "info@anadolufenericamsanatmerkezi.com",
  supportEmail: "destek@anadolufenericamsanatmerkezi.com",
  phone: "+90 (212) 555 0123",
  phone2: "+90 (212) 555 0124",
  address: "Maslak Mahallesi, Büyükdere Caddesi\nNo: 123, Şişli/İstanbul",
  workingHours: {
    weekdays: "Pazartesi - Cuma: 09:00 - 18:00",
    saturday: "Cumartesi: 09:00 - 14:00",
    sunday: "Pazar: Kapalı"
  }
};

export const DEFAULT_SUPPORT = {
  customerService: {
    title: "Müşteri Hizmetleri",
    subtitle: "Sorularınız için 7/24 buradayız",
    description:
      "Siparişleriniz, iade süreçleriniz ve tüm sorularınız için müşteri hizmetleri ekibimizle iletişime geçebilirsiniz.",
    email: "destek@anadolufenericamsanatmerkezi.com",
    phone: "+90 (212) 555 0123",
    whatsapp: "+90 (545) 555 0123",
    supportHours: {
      weekdays: "Pazartesi - Cuma: 09:00 - 18:00",
      saturday: "Cumartesi: 09:00 - 14:00",
      sunday: "Pazar: Kapalı"
    },
    responseTime: "Mesajlarınıza en geç 24 saat içinde dönüş yapıyoruz.",
    faqHint: "Yanıtınızı bulamadıysanız bizimle iletişime geçmekten çekinmeyin."
  },
  paymentOptions: {
    title: "Ödeme Yöntemleri",
    subtitle: "Size en uygun ödeme seçeneğini seçin.",
    securePaymentText: "Tüm ödemeler 256-bit SSL sertifikası ile güvence altındadır.",
    methods: []
  }
};

export const DEFAULT_LEGAL = {
  privacyPolicy: {
    title: "Gizlilik Politikası",
    summary: "Kişisel verilerinizin korunması ve gizliliğiniz bizim için önemlidir.",
    content:
      "Gizliliğiniz bizim için son derece önemlidir. Anadolu Feneri Cam Sanat Merkezi olarak kişisel verilerinizi KVKK kapsamında saklıyoruz.",
    lastUpdated: new Date().toISOString()
  },
  termsOfUse: {
    title: "Kullanım Şartları",
    summary: "Web sitemizi kullanırken uymamız gereken temel kurallar.",
    content: "Bu siteyi kullanarak kullanım şartlarını kabul etmiş sayılırsınız.",
    lastUpdated: new Date().toISOString()
  },
  cookiePolicy: {
    title: "Çerez Politikası",
    summary: "Çerezler ne amaçla kullanılıyor?",
    content: "Sitemizi daha iyi deneyimlemeniz için çerezler kullanıyoruz.",
    lastUpdated: new Date().toISOString()
  }
};

/** Sunucu ve istemci için /api/content tam URL veya göreli yol. */
export function getContentApiUrl() {
  if (typeof window !== "undefined") {
    return getAbsoluteApiUrl("/api/content");
  }
  const base = getApiBaseUrl();
  return base ? `${String(base).replace(/\/+$/, "")}/api/content` : "/api/content";
}

let contentInflight = null;
let contentCache = null;
let contentCacheAt = 0;
const CONTENT_CACHE_MS = 60_000;

/** Mağaza — panelde kaydedilen site içeriği (60 sn paylaşımlı önbellek). */
export async function fetchSiteContent({ force = false } = {}) {
  const now = Date.now();
  if (!force && contentCache && now - contentCacheAt < CONTENT_CACHE_MS) {
    return contentCache;
  }
  if (!force && contentInflight) {
    return contentInflight;
  }

  contentInflight = (async () => {
    const res = await fetch(getContentApiUrl(), { cache: "no-store" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        data?.message || data?.error || `İçerik alınamadı (${res.status})`;
      throw new Error(typeof msg === "string" ? msg : "İçerik alınamadı");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Geçersiz içerik yanıtı");
    }
    contentCache = data;
    contentCacheAt = Date.now();
    return data;
  })();

  try {
    return await contentInflight;
  } finally {
    contentInflight = null;
  }
}

export function invalidateSiteContentCache() {
  contentCache = null;
  contentCacheAt = 0;
}

export function mergeAbout(dataAbout = {}) {
  return {
    ...DEFAULT_ABOUT,
    ...dataAbout,
    companyInfo: {
      ...DEFAULT_ABOUT.companyInfo,
      ...(dataAbout.companyInfo || {})
    },
    values:
      Array.isArray(dataAbout.values) && dataAbout.values.length > 0
        ? dataAbout.values
        : DEFAULT_ABOUT.values,
    cta: {
      ...DEFAULT_ABOUT.cta,
      ...(dataAbout.cta || {})
    }
  };
}

export function mergeContact(dataContact = {}) {
  return {
    ...DEFAULT_CONTACT,
    ...dataContact,
    workingHours: {
      ...DEFAULT_CONTACT.workingHours,
      ...(dataContact.workingHours || {})
    }
  };
}

export function mergeSupport(dataSupport = {}) {
  const methods = Array.isArray(dataSupport.paymentOptions?.methods)
    ? dataSupport.paymentOptions.methods.filter((m) => m?.name && m.enabled !== false)
    : DEFAULT_SUPPORT.paymentOptions.methods;

  return {
    customerService: {
      ...DEFAULT_SUPPORT.customerService,
      ...(dataSupport.customerService || {}),
      supportHours: {
        ...DEFAULT_SUPPORT.customerService.supportHours,
        ...(dataSupport.customerService?.supportHours || {})
      }
    },
    paymentOptions: {
      ...DEFAULT_SUPPORT.paymentOptions,
      ...(dataSupport.paymentOptions || {}),
      methods: methods.length ? methods : DEFAULT_SUPPORT.paymentOptions.methods
    }
  };
}

export function mergeLegal(dataLegal = {}) {
  return {
    privacyPolicy: {
      ...DEFAULT_LEGAL.privacyPolicy,
      ...(dataLegal.privacyPolicy || {})
    },
    termsOfUse: {
      ...DEFAULT_LEGAL.termsOfUse,
      ...(dataLegal.termsOfUse || {})
    },
    cookiePolicy: {
      ...DEFAULT_LEGAL.cookiePolicy,
      ...(dataLegal.cookiePolicy || {})
    }
  };
}

export function mergeSiteContent(raw = {}) {
  const testimonials =
    Array.isArray(raw.testimonials) && raw.testimonials.length > 0
      ? raw.testimonials
      : Array.isArray(raw.about?.testimonials) && raw.about.testimonials.length > 0
        ? raw.about.testimonials
        : DEFAULT_TESTIMONIALS;

  return {
    about: mergeAbout(raw.about),
    contact: mergeContact(raw.contact),
    faq: Array.isArray(raw.faq) ? raw.faq.filter((i) => i?.question?.trim()) : [],
    testimonials,
    legal: mergeLegal(raw.legal),
    support: mergeSupport(raw.support)
  };
}
