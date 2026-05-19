"use client";

import Link from "next/link";
import Image from "next/image";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useSiteContent } from "../../context/SiteContentContext";
import { resolveMediaUrl } from "../../lib/images";
import { asDisplayString } from "../../lib/safeString";

function MissionVisual({ about, siteName }) {
  const missionImg = about.missionImageUrl ? resolveMediaUrl(about.missionImageUrl) : null;
  if (missionImg) {
    return (
      <div className="relative w-full h-96 rounded-2xl overflow-hidden shadow-lg">
        <Image src={missionImg} alt={siteName} fill className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className="w-full h-96 bg-gradient-to-br from-primary/12 to-secondary/20 rounded-2xl flex items-center justify-center">
      <div className="text-center px-6">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
          <span className="text-2xl font-bold text-blue-700">{siteName.slice(0, 2).toUpperCase()}</span>
        </div>
        <p className="text-slate-600 font-medium">{siteName}</p>
      </div>
    </div>
  );
}

function ValueIcon({ iconUrl, title }) {
  const src = iconUrl ? resolveMediaUrl(iconUrl) : null;
  if (src) {
    return (
      <div className="w-14 h-14 mx-auto mb-4 relative">
        <Image src={src} alt={title} width={56} height={56} className="object-contain" unoptimized />
      </div>
    );
  }
  return (
    <div className="w-14 h-14 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
      <span className="text-lg font-bold text-primary">{title?.slice(0, 1) || "?"}</span>
    </div>
  );
}

export default function AboutPage() {
  const { content } = useSiteContent();
  const about = content.about;
  const siteName = asDisplayString(about.heroTitle, "Anadolu Feneri Cam Sanat Merkezi");
  const { companyInfo } = about;
  const values = about.values || [];
  const cta = about.cta || {};
  const companyImg = about.companyImageUrl ? resolveMediaUrl(about.companyImageUrl) : null;

  return (
    <main className="storefront-page">
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-slate-900 mb-6">
            <span className="gradient-text">{about.heroTitle || about.title || "Hakkımızda"}</span>
          </h1>
          {about.heroSubtitle && (
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">{about.heroSubtitle}</p>
          )}
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
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
          <MissionVisual about={about} siteName={siteName} />
        </div>
      </section>

      {values.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Değerlerimiz</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {values.map((item, i) => (
                <Card key={i} className="p-8 text-center">
                  <ValueIcon iconUrl={item.iconUrl} title={item.title} />
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">{item.title}</h3>
                  <p className="text-slate-600">{item.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 mb-6">Şirket Bilgileri</h2>
            <div className="space-y-4">
              {companyInfo.founded && (
                <p className="text-slate-600">Kuruluş: {companyInfo.founded}</p>
              )}
              {companyInfo.location && (
                <p className="text-slate-600">Merkez: {companyInfo.location}</p>
              )}
              {companyInfo.expertise && (
                <p className="text-slate-600">Uzmanlık: {companyInfo.expertise}</p>
              )}
              {companyInfo.customers && (
                <p className="text-slate-600">Müşteri Sayısı: {companyInfo.customers}</p>
              )}
            </div>
          </div>
          <div className="relative w-full h-96 rounded-2xl overflow-hidden bg-gradient-to-br from-green-100 to-blue-100">
            {companyImg ? (
              <Image src={companyImg} alt="Şirket görseli" fill className="object-cover" unoptimized />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-600 font-medium px-4 text-center">{siteName}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="py-16 theme-cta-strip">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            {cta.title || "Bizimle İletişime Geçin"}
          </h2>
          <p className="text-xl text-white/90 mb-8">
            {cta.subtitle || "Sorularınız için müşteri hizmetlerimiz yanınızda"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={cta.primaryLink || "/contact"}>
              <span className="inline-flex items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-slate-900 shadow hover:bg-slate-100 transition-colors">
                {cta.primaryLabel || "İletişim Sayfası"}
              </span>
            </Link>
            <Link href={cta.secondaryLink || "/products"}>
              <span className="inline-flex items-center justify-center rounded-lg border-2 border-white px-6 py-3 text-base font-semibold text-white hover:bg-white hover:text-slate-900 transition-colors">
                {cta.secondaryLabel || "Ürünlerimizi İncele"}
              </span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
