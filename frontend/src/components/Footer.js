"use client";
import Link from "next/link";
import { useSiteSettings } from "../context/SiteSettingsContext";
import { normalizeLogoUrl } from "../lib/images";

const SOCIAL_ICONS = {
  facebook: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
    </svg>
  ),
  instagram: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001.012.001z" />
    </svg>
  ),
  twitter: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
    </svg>
  ),
  linkedin: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.4c-.966 0-1.75-.79-1.75-1.767 0-.977.784-1.767 1.75-1.767s1.75.79 1.75 1.767c0 .977-.784 1.767-1.75 1.767zm13.5 11.4h-3v-5.604c0-1.336-.025-3.055-1.861-3.055-1.861 0-2.148 1.454-2.148 2.954v5.705h-3v-10h2.879v1.367h.041c.401-.761 1.379-1.563 2.84-1.563 3.039 0 3.602 2.001 3.602 4.604v5.592z" />
    </svg>
  ),
  youtube: (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M23.499 6.203a2.997 2.997 0 00-2.112-2.12C19.281 3.5 12.041 3.5 12.041 3.5s-7.24 0-9.346.583a2.997 2.997 0 00-2.112 2.12A31.577 31.577 0 000 12a31.58 31.58 0 00.542 5.797 2.997 2.997 0 002.112 2.12c2.106.583 9.346.583 9.346.583s7.24 0 9.346-.583a2.997 2.997 0 002.112-2.12A31.58 31.58 0 0024 12a31.577 31.577 0 00-.501-5.797zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
};

export default function Footer() {
  const settings = useSiteSettings();
  const siteName = settings.general?.siteName || "Anadolu Feneri Cam Sanat Merkezi";
  const logoUrl = normalizeLogoUrl(settings.general?.logoUrl);
  const siteDescription =
    settings.general?.siteDescription ||
    "Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat ile alışverişin keyfini çıkarın.";
  const contact = settings.contact || {};
  const social = settings.social || {};

  const contactAddress = contact.address || "İstanbul, Türkiye";
  const contactPhone = contact.phone || "+90 (212) 555-0123";
  const contactEmail = contact.email || "info@anadolufenericamsanatmerkezi.com";
  const supportHours = contact.supportHours || "";

  const socialEntries = Object.entries(SOCIAL_ICONS)
    .map(([key, icon]) => ({
      key,
      url: social[key],
      icon
    }))
    .filter(item => Boolean(item.url));

  return (
    <footer className="theme-footer text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Logo ve Açıklama */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 theme-logo-gradient rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">
                  {siteName?.slice(0, 2) || "AF"}
                </span>
              </div>
              <span className="text-2xl font-bold">{siteName}</span>
            </div>
            <p className="text-slate-300 mb-6 leading-relaxed">{siteDescription}</p>
            <div className="flex space-x-4">
              {socialEntries.length > 0 ? (
                socialEntries.map(item => (
                  <a
                    key={item.key}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-primary transition-colors"
                  >
                    {item.icon}
                  </a>
                ))
              ) : (
                <span className="text-sm text-slate-500">Sosyal medya bağlantıları eklenmemiş</span>
              )}
            </div>
          </div>

          {/* Hızlı Linkler */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Hızlı Linkler</h3>
            <ul className="space-y-3">
              <li><Link href="/" className="text-slate-300 hover:text-white transition-colors">Anasayfa</Link></li>
              <li><Link href="/categories" className="text-slate-300 hover:text-white transition-colors">Kategoriler</Link></li>
              <li><Link href="/search" className="text-slate-300 hover:text-white transition-colors">Arama</Link></li>
              <li><Link href="/cart" className="text-slate-300 hover:text-white transition-colors">Sepetim</Link></li>
              <li><Link href="/wishlist" className="text-slate-300 hover:text-white transition-colors">Favorilerim</Link></li>
            </ul>
          </div>

          {/* Müşteri Hizmetleri */}
          <div>
            <h3 className="text-lg font-semibold mb-6">Müşteri Hizmetleri</h3>
            <ul className="space-y-3">
              <li><Link href="/orders" className="text-slate-300 hover:text-white transition-colors">Siparişlerim</Link></li>
              <li><Link href="/profile" className="text-slate-300 hover:text-white transition-colors">Hesabım</Link></li>
              <li><Link href="/contact" className="text-slate-300 hover:text-white transition-colors">İletişim</Link></li>
              <li><Link href="/faq" className="text-slate-300 hover:text-white transition-colors">Sık Sorulan Sorular</Link></li>
              <li><Link href="/returns" className="text-slate-300 hover:text-white transition-colors">İade ve Değişim</Link></li>
            </ul>
          </div>

          {/* İletişim Bilgileri */}
          <div>
            <h3 className="text-lg font-semibold mb-6">İletişim</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <svg className="w-5 h-5 text-primary mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <div>
                  <p className="text-slate-300">{contactAddress}</p>
                  {supportHours && <p className="text-slate-400 text-sm">{supportHours}</p>}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <p className="text-slate-300">{contactPhone}</p>
              </div>
              <div className="flex items-center space-x-3">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-300">{contactEmail}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alt Kısım */}
        <div className="border-t border-slate-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-400 text-sm mb-4 md:mb-0">
              © {new Date().getFullYear()} {siteName}. Tüm hakları saklıdır.
            </div>
            <div className="flex space-x-6 text-sm">
              <Link href="/privacy-policy" className="text-slate-400 hover:text-white transition-colors">Gizlilik Politikası</Link>
              <Link href="/terms-of-use" className="text-slate-400 hover:text-white transition-colors">Kullanım Şartları</Link>
              <Link href="/cookie-policy" className="text-slate-400 hover:text-white transition-colors">Çerez Politikası</Link>
            </div>
          </div>
          
          {/* Ödeme Yöntemleri */}
          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-slate-400 text-sm mb-4">Güvenli Ödeme Yöntemleri:</p>
            <div className="flex flex-wrap gap-4">
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-blue-600">VISA</span>
              </div>
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-red-600">MC</span>
              </div>
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-blue-800">AMEX</span>
              </div>
              <div className="w-12 h-8 bg-white rounded flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">PP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
