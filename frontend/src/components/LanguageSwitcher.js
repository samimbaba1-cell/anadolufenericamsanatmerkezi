"use client";

import { useLocale } from "../context/LocaleContext";

export default function LanguageSwitcher({ className = "" }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={`flex items-center rounded-lg border border-slate-200 bg-white/80 text-sm ${className}`}
      role="group"
      aria-label={t("lang.switch")}
    >
      <button
        type="button"
        onClick={() => setLocale("tr")}
        className={`px-2.5 py-1.5 rounded-l-lg transition-colors ${
          locale === "tr"
            ? "bg-primary text-white font-medium"
            : "text-slate-600 hover:bg-slate-50"
        }`}
        aria-pressed={locale === "tr"}
      >
        TR
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`px-2.5 py-1.5 rounded-r-lg transition-colors ${
          locale === "en"
            ? "bg-primary text-white font-medium"
            : "text-slate-600 hover:bg-slate-50"
        }`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
