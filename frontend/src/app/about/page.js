"use client";

import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Image from "next/image";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import { normalizeLogoUrl } from "../../lib/images";

export default function AboutPage() {
  const settings = useSiteSettings();
  const rawLogo = settings.general?.logoUrl;
  const logoUrl = normalizeLogoUrl(rawLogo);
  const hasLogo = !!logoUrl && logoUrl !== "/images/logo-placeholder.png";

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              <span className="gradient-text">Hakkımızda</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Anadolu Feneri Cam Sanat Merkezi olarak, el işçiliğine ve müşteri memnuniyetine odaklanarak özgün cam sanat eserleri sunuyoruz.
            </p>
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Misyonumuz</h2>
              <p className="text-lg text-slate-600 mb-6">
                Müşterilerimize en kaliteli ürünleri en uygun fiyatlarla sunarak, 
                alışveriş deneyimlerini kolaylaştırmak ve memnuniyetlerini sağlamak.
              </p>
              <p className="text-lg text-slate-600 mb-8">
                Teknoloji ve müşteri hizmetlerindeki yeniliklerle sektörde öncü olmaya devam ediyoruz.
              </p>
              <Button className="btn-primary">
                Ürünlerimizi İncele
              </Button>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden">
                    {hasLogo ? (
                      <Image
                        src={logoUrl}
                        alt={settings.general?.siteName || "Site logosu"}
                        width={96}
                        height={96}
                        className="object-contain w-full h-full"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl font-bold text-blue-700">
                        {(settings.general?.siteName || "Mağaza")
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 font-medium">
                    {settings.general?.siteName || "Anadolu Feneri Cam Sanat Merkezi"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Değerlerimiz</h2>
            <p className="text-lg text-slate-600">Çalışma prensiplerimiz ve değerlerimiz</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Kalite</h3>
              <p className="text-slate-600">
                Sadece en kaliteli ürünleri müşterilerimize sunuyoruz.
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Hız</h3>
              <p className="text-slate-600">
                Hızlı teslimat ve müşteri hizmetleri ile yanınızdayız.
              </p>
            </Card>

            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">Güven</h3>
              <p className="text-slate-600">
                Müşteri güvenliği ve memnuniyeti bizim önceliğimiz.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Company Info Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-6">Şirket Bilgileri</h2>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-600">Kuruluş: 2020</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-600">Merkez: İstanbul, Türkiye</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-600">Uzmanlık: E-ticaret ve Dijital Pazarlama</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-slate-600">Müşteri Sayısı: 10,000+</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="w-full h-96 bg-gradient-to-br from-green-100 to-blue-100 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium">Anadolu Feneri Cam Sanat Merkezi</p>
                  <p className="text-slate-500 text-sm">E-ticaret Platformu</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Bizimle İletişime Geçin
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Sorularınız için 7/24 müşteri hizmetlerimiz yanınızda
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-white text-blue-600 hover:bg-blue-50">
              İletişim Sayfası
            </Button>
            <Button className="border-2 border-white text-white hover:bg-white hover:text-blue-600">
              Ürünlerimizi İncele
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}