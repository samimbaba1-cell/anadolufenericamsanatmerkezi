"use client";

export const dynamic = "force-dynamic";
import Card from "../../components/ui/Card";
import Link from "next/link";
import { useLocale } from "../../context/LocaleContext";

export default function ReturnsPage() {
  const { routes, t, locale } = useLocale();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 text-center">
          {t("returns.title")}
        </h1>
        <p className="text-slate-700 mb-4">
          {locale === "en"
            ? "Customer satisfaction is our priority. You can easily process returns and exchanges under the conditions below."
            : "Müşteri memnuniyeti bizim için önceliklidir. Aşağıdaki koşullar kapsamında iade ve değişim işlemlerinizi kolayca yapabilirsiniz."}
        </p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {locale === "en" ? "Return Conditions" : "İade Koşulları"}
            </h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2">
              <li>
                {locale === "en"
                  ? "You may request a return within 14 days of delivery."
                  : "Ürünü teslim aldıktan sonra 14 gün içinde iade talebinde bulunabilirsiniz."}
              </li>
              <li>
                {locale === "en"
                  ? "The product must be unused, resalable, and in original packaging."
                  : "Ürün kullanılmamış, yeniden satılabilir durumda ve orijinal ambalajında olmalıdır."}
              </li>
              <li>
                {locale === "en"
                  ? "It must be sent with the invoice and all accessories."
                  : "Faturası ve tüm aksesuarları ile birlikte gönderilmelidir."}
              </li>
            </ul>
          </section>

          <p className="text-slate-700">
            {locale === "en" ? "For details, you can " : "Detaylı bilgi için bizimle "}
            <Link href={routes.contact} className="text-primary underline">
              {t("returns.contactLink")}
            </Link>
            {locale === "en" ? "." : "."}
          </p>
        </div>
      </Card>
    </main>
  );
}
