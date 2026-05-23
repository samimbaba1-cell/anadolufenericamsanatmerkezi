"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import Card from "../../components/ui/Card";
import { useSiteContent } from "../../context/SiteContentContext";
import { routes } from "../../lib/routes";

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({});
  const { content, loading } = useSiteContent();
  const faqItems = content.faq || [];

  const toggleItem = (index) => {
    setOpenItems((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Sıkça Sorulan Sorular</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Merak ettiğiniz soruların cevaplarını burada bulabilirsiniz
        </p>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-12">Yükleniyor...</p>
      ) : faqItems.length === 0 ? (
        <p className="text-center text-gray-500 py-12">
          Henüz SSS eklenmemiş. Yönetim panelinden içerik ekleyebilirsiniz.
        </p>
      ) : (
        <div className="space-y-4">
          {faqItems.map((item, index) => {
            const isOpen = openItems[index];
            return (
              <Card key={index} className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleItem(index)}
                  className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-6 pb-4">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-gray-600 leading-relaxed whitespace-pre-line">{item.answer}</p>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="mt-12 text-center">
        <Card className="p-8 rounded-2xl overflow-hidden section-muted-band border border-border">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Aradığınız cevabı bulamadınız mı?</h3>
          <p className="text-gray-600 mb-6">
            Müşteri hizmetlerimizle iletişime geçin, size yardımcı olmaktan mutluluk duyarız.
          </p>
          <Link href={routes.contact} className="btn-primary">
            İletişime Geç
          </Link>
        </Card>
      </div>
    </main>
  );
}
