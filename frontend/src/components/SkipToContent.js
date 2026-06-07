"use client";

import { useLocale } from "../context/LocaleContext";

export default function SkipToContent() {
  const { t } = useLocale();
  return (
    <a href="#main-content" className="skip-link">
      {t("a11y.skipToContent")}
    </a>
  );
}
