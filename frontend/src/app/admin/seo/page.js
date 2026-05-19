"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch, getMediaUploadUrl } from "../../../lib/api";
import { resolveMediaUrl } from "../../../lib/images";
import MediaPicker from "../../../components/admin/MediaPicker";

const DEFAULT_SEO = {
  siteTitle: "Anadolu Feneri Cam Sanat Merkezi - Kaliteli Ürünler, Güvenilir Hizmet",
  siteDescription:
    "Anadolu Feneri Cam Sanat Merkezi ile el yapımı cam sanat eserleri ve dekoratif ürünleri keşfedin. Hızlı teslimat, güvenli ödeme ve müşteri memnuniyeti garantisi.",
  keywords: "e-ticaret, online alışveriş, kaliteli ürünler, güvenli ödeme, hızlı teslimat",
  ogTitle: "Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş",
  ogDescription: "Kaliteli ürünleri uygun fiyatlarla keşfedin. Hızlı teslimat ve güvenli ödeme garantisi.",
  ogImage: "",
  twitterCard: "summary_large_image",
  twitterSite: "@anadolufenericam",
  twitterCreator: "@anadolufenericam",
  robots: "index, follow",
  canonicalUrl: "",
  sitemapUrl: "/sitemap.xml",
  googleAnalytics: "",
  googleSearchConsole: "",
  facebookPixel: "",
  customHead: "",
  customFooter: ""
};

const TWITTER_CARD_OPTIONS = [
  { value: "summary", label: "Summary" },
  { value: "summary_large_image", label: "Summary Large Image" },
  { value: "app", label: "App" },
  { value: "player", label: "Player" }
];

async function uploadSingleFile(file, token) {
  if (!file) return null;
  const formData = new FormData();
  formData.append("files", file);

  const response = await fetch(getMediaUploadUrl(), {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData
  });

  if (!response.ok) {
    throw new Error("Dosya yüklenemedi");
  }

  const data = await response.json();
  const url = data?.files?.[0]?.url;
  if (!url) {
    throw new Error("Yüklenen dosya URL'si alınamadı");
  }
  return url;
}

const validateSeo = (seo) => {
  const errors = {};
  if (!seo.siteTitle?.trim()) {
    errors.siteTitle = "Site başlığı zorunludur.";
  } else if (seo.siteTitle.trim().length > 120) {
    errors.siteTitle = "Başlık en fazla 120 karakter olabilir.";
  }

  if (!seo.siteDescription?.trim()) {
    errors.siteDescription = "Site açıklaması zorunludur.";
  } else if (seo.siteDescription.trim().length > 320) {
    errors.siteDescription = "Açıklama en fazla 320 karakter olabilir.";
  }

  if (!seo.keywords?.trim()) {
    errors.keywords = "Anahtar kelimeler zorunludur.";
  }

  if (seo.canonicalUrl?.trim() && !/^https?:\/\//i.test(seo.canonicalUrl.trim())) {
    errors.canonicalUrl = "Canonical URL http(s) ile başlamalıdır.";
  }

  if (seo.ogImage?.trim()) {
    const lower = seo.ogImage.trim().toLowerCase();
    const ok =
      lower.startsWith("/") || lower.startsWith("http://") || lower.startsWith("https://");
    if (!ok) {
      errors.ogImage = "OG görseli medya kütüphanesinden seçin veya geçerli bir yol girin.";
    }
  }

  return errors;
};

const buildSearchPreview = (seo) => ({
  title: seo.siteTitle?.trim() || "",
  description: seo.siteDescription?.trim() || "",
  url: seo.canonicalUrl?.trim() || "https://www.orneksite.com"
});

export default function SeoPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [seo, setSeo] = useState(DEFAULT_SEO);
  const [initialSeo, setInitialSeo] = useState(DEFAULT_SEO);
  const [validationErrors, setValidationErrors] = useState({});
  const [sitemapStatus, setSitemapStatus] = useState({
    status: "unknown",
    totalPages: 0,
    lastGenerated: null,
    sitemapUrl: "/sitemap.xml"
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [issues, setIssues] = useState([]);
  const [ogFile, setOgFile] = useState(null);
  const [ogPreview, setOgPreview] = useState(null);
  const [generatingSitemap, setGeneratingSitemap] = useState(false);

  useEffect(() => {
    if (!ogFile) {
      setOgPreview(null);
      return;
    }
    const url = URL.createObjectURL(ogFile);
    setOgPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [ogFile]);

  const loadSeo = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/seo", { token });
      const merged = { ...DEFAULT_SEO, ...(data || {}) };
      setSeo(merged);
      setInitialSeo(merged);
      setValidationErrors({});
      setOgFile(null);
    } catch (error) {
      console.error("SEO load error", error);
      showToast(error.message || "SEO ayarları yüklenemedi", "error");
    } finally {
      setLoading(false);
    }
  }, [token, showToast]);

  const loadSitemapStatus = useCallback(async () => {
    try {
      const data = await apiFetch("/api/seo/sitemap-status");
      setSitemapStatus({
        status: "unknown",
        totalPages: 0,
        sitemapUrl: "/sitemap.xml",
        ...(data || {})
      });
    } catch (error) {
      console.error("Sitemap status error", error);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    loadSeo();
    loadSitemapStatus();
  }, [authLoading, loadSeo, loadSitemapStatus]);

  const handleInputChange = (field, value) => {
    setSeo((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!token) return;
    const errors = validateSeo(seo);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showToast("Lütfen hataları düzeltin", "warning");
      return;
    }

    setSaving(true);
    try {
      let ogImageUrl = seo.ogImage;
      if (ogFile) {
        ogImageUrl = await uploadSingleFile(ogFile, token);
      }
      const payload = {
        ...seo,
        siteTitle: seo.siteTitle.trim(),
        siteDescription: seo.siteDescription.trim(),
        keywords: seo.keywords.trim(),
        ogTitle: seo.ogTitle.trim(),
        ogDescription: seo.ogDescription.trim(),
        ogImage: ogImageUrl?.trim(),
        canonicalUrl: seo.canonicalUrl.trim(),
        twitterSite: seo.twitterSite.trim(),
        twitterCreator: seo.twitterCreator.trim(),
        googleAnalytics: seo.googleAnalytics.trim(),
        googleSearchConsole: seo.googleSearchConsole.trim(),
        facebookPixel: seo.facebookPixel.trim()
      };

      const updated = await apiFetch("/api/seo", {
        method: "PUT",
        token,
        body: payload
      });
      const merged = { ...DEFAULT_SEO, ...(updated || {}) };
      setSeo(merged);
      setInitialSeo(merged);
      setValidationErrors({});
      setOgFile(null);
      showToast("SEO ayarları güncellendi", "success");
    } catch (error) {
      console.error("SEO save error", error);
      showToast(error.message || "SEO ayarları kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSitemap = async () => {
    if (!token) return;
    setGeneratingSitemap(true);
    try {
      await apiFetch("/api/seo/generate-sitemap", { method: "POST", token });
      showToast("Sitemap başarıyla oluşturuldu", "success");
      loadSitemapStatus();
    } catch (error) {
      console.error("Sitemap generation error", error);
      showToast(error.message || "Sitemap oluşturulamadı", "error");
    } finally {
      setGeneratingSitemap(false);
    }
  };

  const testSeo = () => {
    const currentIssues = [];
    const errors = validateSeo(seo);
    Object.keys(errors).forEach((key) => currentIssues.push(errors[key]));
    if (!seo.ogImage?.trim() && !ogFile) {
      currentIssues.push("Open Graph görseli ayarlanmadı.");
    }
    if (!seo.twitterSite?.trim()) {
      currentIssues.push("Twitter hesap adı boş.");
    }
    setIssues(currentIssues);
    setTesting(true);
    setTimeout(() => {
      setTesting(false);
      if (currentIssues.length === 0) {
        showToast("SEO ayarları hazır görünüyor! 🎉", "success");
      } else {
        showToast(`${currentIssues.length} SEO önerisi bulundu`, "warning");
      }
    }, 400);
  };

  const handleResetChanges = () => {
    setSeo(initialSeo);
    setValidationErrors({});
    setIssues([]);
    setOgFile(null);
  };

  const googlePreview = useMemo(() => buildSearchPreview(seo), [seo]);
  const sitemapBadge = useMemo(() => {
    if (sitemapStatus.status === "active") return "bg-green-100 text-green-700";
    if (sitemapStatus.status === "not_found") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
  }, [sitemapStatus.status]);

  const isDirty =
    JSON.stringify(seo) !== JSON.stringify(initialSeo) ||
    Boolean(ogFile);

  if (authLoading || loading) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
    return (
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-700">Bu sayfa yalnızca adminler içindir.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold">SEO Yönetimi</h1>
          <p className="text-gray-600">Arama motoru görünürlüğünüzü maksimize edin</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={handleResetChanges} disabled={!isDirty || saving}>
            Değişiklikleri Geri Al
          </Button>
          <Button variant="secondary" onClick={loadSeo} disabled={saving}>
            Yenile
          </Button>
          <Button onClick={handleSave} disabled={saving || !isDirty} loading={saving}>
            Kaydet
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Temel SEO Ayarları</h2>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Site Başlığı</span>
              <input
                type="text"
                value={seo.siteTitle}
                onChange={(e) => handleInputChange("siteTitle", e.target.value)}
                className={`input-modern ${validationErrors.siteTitle ? "border-red-500" : ""}`}
                placeholder="Site başlığınız (50-60 karakter önerilir)"
                maxLength={80}
              />
              <span className="text-xs text-gray-500">{seo.siteTitle.length}/70 karakter</span>
              {validationErrors.siteTitle && <p className="text-xs text-red-600">{validationErrors.siteTitle}</p>}
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Site Açıklaması</span>
              <textarea
                rows={3}
                value={seo.siteDescription}
                onChange={(e) => handleInputChange("siteDescription", e.target.value)}
                className={`input-modern ${validationErrors.siteDescription ? "border-red-500" : ""}`}
                placeholder="Site açıklamanız (150-160 karakter önerilir)"
                maxLength={200}
              />
              <span className="text-xs text-gray-500">{seo.siteDescription.length}/180 karakter</span>
              {validationErrors.siteDescription && (
                <p className="text-xs text-red-600">{validationErrors.siteDescription}</p>
              )}
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Anahtar Kelimeler</span>
              <input
                type="text"
                value={seo.keywords}
                onChange={(e) => handleInputChange("keywords", e.target.value)}
                className={`input-modern ${validationErrors.keywords ? "border-red-500" : ""}`}
                placeholder="anahtar, kelime, virgülle, ayrılmış"
              />
              {validationErrors.keywords && <p className="text-xs text-red-600">{validationErrors.keywords}</p>}
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Canonical URL</span>
              <input
                type="url"
                value={seo.canonicalUrl}
                onChange={(e) => handleInputChange("canonicalUrl", e.target.value)}
                className={`input-modern ${validationErrors.canonicalUrl ? "border-red-500" : ""}`}
                placeholder="https://siteadresiniz.com"
              />
              {validationErrors.canonicalUrl && (
                <p className="text-xs text-red-600">{validationErrors.canonicalUrl}</p>
              )}
            </label>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">Open Graph (Sosyal Paylaşım)</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  setSeo((prev) => ({
                    ...prev,
                    ogTitle: prev.siteTitle,
                    ogDescription: prev.siteDescription
                  }))
                }
              >
                Başlık/Açıklamayı Kopyala
              </Button>
            </div>
            <label className="space-y-2 text-sm text-gray-700">
              <span>OG Başlık</span>
              <input
                type="text"
                value={seo.ogTitle}
                onChange={(e) => handleInputChange("ogTitle", e.target.value)}
                className="input-modern"
                maxLength={90}
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>OG Açıklama</span>
              <textarea
                rows={2}
                value={seo.ogDescription}
                onChange={(e) => handleInputChange("ogDescription", e.target.value)}
                className="input-modern"
                maxLength={200}
              />
            </label>
            
            <MediaPicker
              label="OG Görsel (sosyal paylaşım)"
              value={seo.ogImage}
              onChange={(url) => {
                setOgFile(null);
                handleInputChange("ogImage", url);
              }}
              hint="Facebook, WhatsApp vb. paylaşımlarda görünür"
            />
            {validationErrors.ogImage && <p className="text-xs text-red-600">{validationErrors.ogImage}</p>}
</Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Twitter Cards</h2>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Twitter Card Tipi</span>
              <select
                value={seo.twitterCard}
                onChange={(e) => handleInputChange("twitterCard", e.target.value)}
                className="input-modern"
              >
                {TWITTER_CARD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Twitter Site</span>
              <input
                type="text"
                value={seo.twitterSite}
                onChange={(e) => handleInputChange("twitterSite", e.target.value)}
                className="input-modern"
                placeholder="@anadolufenericam"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Twitter Creator</span>
              <input
                type="text"
                value={seo.twitterCreator}
                onChange={(e) => handleInputChange("twitterCreator", e.target.value)}
                className="input-modern"
                placeholder="@anadolufenericam"
              />
            </label>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Analytics & Scriptler</h2>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Google Analytics ID</span>
              <input
                type="text"
                value={seo.googleAnalytics}
                onChange={(e) => handleInputChange("googleAnalytics", e.target.value)}
                className="input-modern"
                placeholder="G-XXXXXXXXXX"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Google Search Console</span>
              <input
                type="text"
                value={seo.googleSearchConsole}
                onChange={(e) => handleInputChange("googleSearchConsole", e.target.value)}
                className="input-modern"
                placeholder="Verification code"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Facebook Pixel ID</span>
              <input
                type="text"
                value={seo.facebookPixel}
                onChange={(e) => handleInputChange("facebookPixel", e.target.value)}
                className="input-modern"
                placeholder="123456789012345"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Özel Head Scriptleri</span>
              <textarea
                rows={3}
                value={seo.customHead}
                onChange={(e) => handleInputChange("customHead", e.target.value)}
                className="input-modern"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Özel Footer Scriptleri</span>
              <textarea
                rows={3}
                value={seo.customFooter}
                onChange={(e) => handleInputChange("customFooter", e.target.value)}
                className="input-modern"
              />
            </label>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Google Önizlemesi</h2>
            <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
              <p className="text-green-700">{googlePreview.url}</p>
              <p className="text-xl text-blue-700 line-clamp-2">{googlePreview.title}</p>
              <p className="text-gray-700 line-clamp-3">{googlePreview.description}</p>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Sitemap Durumu</h2>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Durum</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${sitemapBadge}`}>
                {sitemapStatus.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Toplam Sayfa</span>
              <span className="font-semibold text-gray-900">{sitemapStatus.totalPages}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Son oluşturma</span>
              <span>
                {sitemapStatus.lastGenerated
                  ? new Date(sitemapStatus.lastGenerated).toLocaleString("tr-TR")
                  : "Bilgi yok"}
              </span>
            </div>
            <div className="text-sm text-blue-600">
              <a href={sitemapStatus.sitemapUrl || "/sitemap.xml"} target="_blank" rel="noreferrer">
                Sitemap&apos;i görüntüle
              </a>
            </div>
            <Button onClick={handleGenerateSitemap} disabled={generatingSitemap} loading={generatingSitemap}>
              Sitemap Oluştur
            </Button>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">SEO Kontrol</h2>
              <Button onClick={testSeo} disabled={testing} size="sm">
                {testing ? "Kontrol ediliyor..." : "Testi Çalıştır"}
              </Button>
            </div>
            <p className="text-sm text-gray-600">SEO kurulumu için hızlı bir kontrol yapın.</p>
            {issues.length > 0 && (
              <ul className="list-inside list-disc text-sm text-orange-600">
                {issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-6 space-y-3 text-sm text-gray-600">
            <h2 className="text-lg font-semibold text-gray-900">Robots.txt</h2>
            <p>Robots dosyası dinamik olarak oluşturulur ve sitemap URL’sini içerir.</p>
            <a href="/api/seo/robots" target="_blank" className="text-blue-600 hover:underline">
              Robots.txt görüntüle
            </a>
          </Card>
        </div>
      </div>
    </main>
  );
}

