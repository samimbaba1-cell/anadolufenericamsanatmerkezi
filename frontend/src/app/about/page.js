"use client";

import Link from "next/link";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Image from "next/image";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { useSiteContent } from "../../context/SiteContentContext";
import { normalizeLogoUrl } from "../../lib/images";
import { asDisplayString } from "../../lib/safeString";

export default function AboutPage() {
  const settings = useSiteSettings();
  const { content } = useSiteContent();
  const about = content.about;
  const rawLogo = settings.general?.logoUrl;
  const logoUrl = normalizeLogoUrl(rawLogo);
  const hasLogo = !!logoUrl && logoUrl !== "/images/logo-placeholder.png";
  const siteName = asDisplayString(
    settings.general?.siteName,
    "Anadolu Feneri Cam Sanat Merkezi"
  );
  const { companyInfo } = about;

  return (
    <main className="storefront-page">
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              <span className="gradient-text">{about.heroTitle || about.title || "Hakkımızda"}</span>
            </h1>
            {about.heroSubtitle && (
              <p className="text-xl text-slate-600 max-w-3xl mx-auto">{about.heroSubtitle}</p>
            )}
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Misyonumuz</h2>
              {about.mission && (
                <p className="text-lg text-slate-600 mb-6 whitespace-pre-line">{about.mission}</p>
              )}
              {about.vision && (
                <>
                  <h3 className="text-2xl font-bold text-slate-900 mb-4">Vizyonumuz</h3>
                  <p className="text-lg text-slate-600 mb-8 whitespace-pre-line">{about.vision}</p>
                </>
              )}
              <Link href="/products">
                <Button className="btn-primary">Ürünlerimizi İncele</Button>
              </Link>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-primary/12 to-secondary/20 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
                    {hasLogo ? (
                      <Image
                        src={logoUrl}
                        alt={siteName}
                        width={96}
                        height={96}
                        className="object-contain w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl font-bold text-blue-700">
                        {siteName.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-medium">{siteName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Değerlerimiz</h2>
            <p className="text-lg text-slate-600">Çalışma prensiplerimiz ve değerlerimiz</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Kalite</h3>
              <p className="text-slate-600">Sadece en kaliteli ürünleri müşterilerimize sunuyoruz.</p>
            </Card>
            <Card className="p-8 text-center">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Hız</h3>
              <p className="text-slate-600">Hızlı teslimat ve müşteri hizmetleri ile yanınızdayız.</p>
            </Card>
            <Card className="p-8 text-center">
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Güven</h3>
              <p className="text-slate-600">Müşteri güvenliği ve memnuniyeti bizim önceliğimiz.</p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Şirket Bilgileri</h2>
              <div className="space-y-4">
                {companyInfo.founded && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-600">Kuruluş: {companyInfo.founded}</span>
                  </div>
                )}
                {companyInfo.location && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-600">Merkez: {companyInfo.location}</span>
                  </div>
                )}
                {companyInfo.expertise && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-600">Uzmanlık: {companyInfo.expertise}</span>
                  </div>
                )}
                {companyInfo.customers && (
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span className="text-slate-600">Müşteri Sayısı: {companyInfo.customers}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <p className="text-slate-600 font-medium">{siteName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 theme-cta-strip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Bizimle İletişime Geçin</h2>
          <p className="text-xl text-white/85 mb-8">Sorularınız için müşteri hizmetlerimiz yanınızda</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button className="bg-white text-primary hover:bg-surface">İletişim Sayfası</Button>
            </Link>
            <Link href="/products">
              <Button className="border-2 border-white text-white hover:bg-white hover:text-primary">
                Ürünlerimizi İncele
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
