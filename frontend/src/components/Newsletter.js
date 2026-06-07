"use client";
import { useState } from "react";
import Link from "next/link";
import Button from "./ui/Button";
import { useLocale } from "../context/LocaleContext";

export default function Newsletter() {
  const { routes, t, locale } = useLocale();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/newsletter/subscribe`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        }
      );

      if (response.ok) {
        setMessage(t("newsletter.subscribe"));
        setEmail("");
      } else {
        const data = await response.json();
        setMessage(data.message || t("common.error"));
      }
    } catch {
      setMessage(t("common.error"));
    }
    setLoading(false);
  };

  return (
    <div className="theme-cta-strip text-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold mb-4">{t("newsletter.title")}</h2>
        <p className="text-xl text-white/85 mb-8 max-w-2xl mx-auto">
          {locale === "en"
            ? "Be the first to know about special discounts, new products, and campaigns"
            : "Özel indirimler, yeni ürünler ve kampanyalar hakkında ilk siz haberdar olun"}
        </p>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletter.placeholder")}
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 font-semibold"
            >
              {loading ? t("common.loading") : t("newsletter.subscribe")}
            </Button>
          </div>

          {message && (
            <div className="mt-4 p-3 rounded-lg bg-white/10 text-white text-sm">{message}</div>
          )}
        </form>

        <p className="text-sm text-blue-200 mt-4">
          {t("newsletter.privacyNote")}{" "}
          <Link href={routes.privacy} className="underline">
            {t("footer.privacy")}
          </Link>
        </p>
      </div>
    </div>
  );
}
