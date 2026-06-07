"use client";

import { useMemo } from "react";
import { useSiteContent } from "../context/SiteContentContext";
import { useLocale } from "../context/LocaleContext";
import { resolveLegalPolicy } from "../lib/localizedContent";

function renderParagraphs(text = "") {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index} className="text-lg leading-relaxed text-slate-600">
        {paragraph.trim()}
      </p>
    ));
}

export default function LegalDocumentPage({ policyKey }) {
  const { content, loading } = useSiteContent();
  const { t, locale } = useLocale();
  const policy = useMemo(
    () => resolveLegalPolicy(policyKey, content.legal?.[policyKey], locale),
    [content.legal, policyKey, locale]
  );
  const dateLocale = locale === "en" ? "en-US" : "tr-TR";

  if (loading) {
    return (
      <main className="storefront-page py-16">
        <p className="text-center text-slate-500">{t("common.loading")}</p>
      </main>
    );
  }

  return (
    <main className="storefront-page py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <header className="space-y-4 text-center">
          <h1 className="text-4xl font-bold text-slate-900">{policy.title}</h1>
          {policy.summary && <p className="text-lg text-slate-600">{policy.summary}</p>}
          {policy.lastUpdated && (
            <p className="text-sm text-slate-500">
              {t("common.lastUpdated")}{" "}
              {new Date(policy.lastUpdated).toLocaleDateString(dateLocale)}
            </p>
          )}
        </header>

        <section className="rounded-2xl bg-white p-8 shadow-lg space-y-6">
          {renderParagraphs(policy.content)}
        </section>
      </div>
    </main>
  );
}
