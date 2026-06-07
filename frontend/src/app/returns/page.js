"use client";

export const dynamic = "force-dynamic";
import Card from "../../components/ui/Card";
import Link from "next/link";
import { useLocale } from "../../context/LocaleContext";

export default function ReturnsPage() {
  const { routes, t } = useLocale();

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 text-center">
          {t("returns.title")}
        </h1>
        <p className="text-slate-700 mb-4">{t("returns.intro")}</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              {t("returns.conditionsTitle")}
            </h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2">
              <li>{t("returns.condition1")}</li>
              <li>{t("returns.condition2")}</li>
              <li>{t("returns.condition3")}</li>
            </ul>
          </section>

          <p className="text-slate-700">
            {t("returns.contactPrefix")}
            <Link href={routes.contact} className="text-primary underline">
              {t("returns.contactLink")}
            </Link>
            .
          </p>
        </div>
      </Card>
    </main>
  );
}
