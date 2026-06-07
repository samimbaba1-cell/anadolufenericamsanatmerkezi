import tr from "../messages/tr.json";
import en from "../messages/en.json";

const BUNDLES = { tr, en };

/** Admin alanı — isteğe bağlı titleEn / contentEn ile locale seçimi */
export function localizedField(record, field, locale = "tr") {
  if (!record || typeof record !== "object") return "";
  if (locale === "en") {
    const enVal = record[`${field}En`];
    if (enVal != null && String(enVal).trim()) return String(enVal).trim();
  }
  const val = record[field];
  return val != null ? String(val) : "";
}

/** Hukuki sayfalar: EN modda admin yalnızca TR ise mesaj dosyasındaki İngilizce şablon */
export function resolveLegalPolicy(policyKey, adminPolicy = {}, locale = "tr") {
  const admin = adminPolicy || {};
  const bundle = BUNDLES[locale]?.legalDocuments?.[policyKey] || null;

  const titleEn = localizedField(admin, "title", "en");
  const summaryEn = localizedField(admin, "summary", "en");
  const contentEn = localizedField(admin, "content", "en");
  const hasAdminEn = Boolean(titleEn || summaryEn || contentEn);

  if (locale === "en") {
    if (hasAdminEn) {
      return {
        title: titleEn || bundle?.title || admin.title || "",
        summary: summaryEn || bundle?.summary || "",
        content: contentEn || bundle?.content || "",
        lastUpdated: admin.lastUpdated || bundle?.lastUpdated
      };
    }
    if (bundle) {
      return {
        title: bundle.title,
        summary: bundle.summary || "",
        content: bundle.content || "",
        lastUpdated: admin.lastUpdated || bundle.lastUpdated
      };
    }
  }

  return {
    title: admin.title || bundle?.title || "",
    summary: admin.summary || bundle?.summary || "",
    content: admin.content || bundle?.content || "",
    lastUpdated: admin.lastUpdated || bundle?.lastUpdated
  };
}

/** Banner / CTA — EN modda admin metni yerine UI çevirisi (özel isimler korunur) */
export function resolveBannerCta(buttonText, locale, fallbackKey, t) {
  if (locale === "en") return t(fallbackKey);
  return buttonText?.trim() || t(fallbackKey);
}
