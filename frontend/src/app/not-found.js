"use client";

import Link from "next/link";
import { useLocale } from "../context/LocaleContext";

export default function NotFound() {
  const { routes, t } = useLocale();

  return (
    <main className="max-w-3xl mx-auto p-10 text-center">
      <h1 className="text-3xl font-semibold mb-2">{t("notFound.title")}</h1>
      <p className="text-gray-600">{t("notFound.desc")}</p>
      <Link
        href={routes.home}
        className="inline-block mt-6 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {t("notFound.goHome")}
      </Link>
    </main>
  );
}
