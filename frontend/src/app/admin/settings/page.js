"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";
import { normalizeLogoUrl } from "../../../lib/images";

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

const INITIAL_SETTINGS = {
  general: {
    siteName: "Anadolu Feneri Cam Sanat Merkezi",
    siteDescription: "Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat",
    siteSlogan: "Kaliteli ürünler, güvenilir hizmet",
    logoUrl: "/images/logo-placeholder.png",
    faviconUrl: "/icons/icon-192.svg"
  },
  contact: {
    email: "info@anadolufenericamsanatmerkezi.com",
    phone: "+90 (212) 555-0123",
    address: "İstanbul, Türkiye",
    whatsapp: "",
    supportHours: "Hafta içi 09:00 - 18:00"
  },
  social: {
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: ""
  },
  seo: {
    metaTitle: "Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş",
    metaDescription: "En kaliteli ürünleri uygun fiyatlarla bulun",
    keywords: "e-ticaret, online alışveriş, kaliteli ürünler"
  },
  analytics: {
    googleAnalyticsId: "",
    googleAnalyticsEnabled: false,
    facebookPixelId: "",
    facebookPixelEnabled: false,
    tawkToId: "",
    customScriptsHead: "",
    customScriptsBody: ""
  },
  email: {
    enableSmtp: false,
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    user: "",
    password: "",
    fromEmail: "noreply@anadolufenericamsanatmerkezi.com",
    fromName: "Anadolu Feneri Cam Sanat Merkezi"
  },
  payment: {
    enableIyzico: true,
    iyzicoApiKey: "",
    iyzicoSecretKey: "",
    iyzicoBaseUrl: "https://sandbox-api.iyzipay.com",
    enableCashOnDelivery: true,
    enableBankTransfer: false,
    bankAccounts: []
  },
  shipping: {
    enableFreeShipping: true,
    freeShippingThreshold: 500,
    shippingCost: 25,
    shippingCompanies: ["Aras Kargo", "Yurtiçi Kargo", "MNG Kargo"],
    defaultShippingCompany: "Aras Kargo",
    estimatedDeliveryDays: 3
  },
  notifications: {
    enableEmailNotifications: true,
    alertEmail: "",
    lowStockAlert: true,
    orderEmailsToAdmin: true
  },
  theme: {
    primaryColor: "#3B82F6",
    secondaryColor: "#8B5CF6",
    accentColor: "#F59E0B",
    buttonRadius: 8
  }
};

function mergeSettings(base, incoming = {}) {
  const merged = {
    general: { ...base.general, ...(incoming.general || {}) },
    contact: { ...base.contact, ...(incoming.contact || {}) },
    social: { ...base.social, ...(incoming.social || {}) },
    seo: { ...base.seo, ...(incoming.seo || {}) },
    analytics: { ...base.analytics, ...(incoming.analytics || {}) },
    email: { ...base.email, ...(incoming.email || {}) },
    payment: { ...base.payment, ...(incoming.payment || {}) },
    shipping: {
      ...base.shipping,
      ...(incoming.shipping || {}),
      shippingCompanies: (incoming.shipping?.shippingCompanies?.length
        ? incoming.shipping.shippingCompanies
        : base.shipping.shippingCompanies)
    },
    notifications: { ...base.notifications, ...(incoming.notifications || {}) },
    theme: { ...base.theme, ...(incoming.theme || {}) }
  };

  merged.general.logoUrl = normalizeLogoUrl(merged.general.logoUrl);
  merged.general.faviconUrl = mergeFaviconUrl(merged.general.faviconUrl);
  return merged;
}

function mergeFaviconUrl(value) {
  const trimmed = (value || "").trim();
  if (!trimmed) {
    return "/icons/icon-192.svg";
  }
  return trimmed;
}

const TABS = [
  { id: "general", name: "Genel", icon: "⚙️" },
  { id: "payment", name: "Ödeme", icon: "💳" },
  { id: "shipping", name: "Kargo", icon: "🚚" },
  { id: "email", name: "E-posta", icon: "📧" },
  { id: "analytics", name: "Analitik", icon: "📊" },
  { id: "notifications", name: "Bildirimler", icon: "🔔" }
];

function SettingsPageContent() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState(() => mergeSettings(INITIAL_SETTINGS, {}));
  const [themeDrafts, setThemeDrafts] = useState(() => ({ ...INITIAL_SETTINGS.theme }));
  const [themeErrors, setThemeErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const smtpDisabled = !settings.email.enableSmtp;
  const emailNotificationsDisabled = !settings.notifications.enableEmailNotifications;

  useEffect(() => {
    if (authLoading || !token) {
      return;
    }

    let cancelled = false;

    async function loadSettings() {
      setFetching(true);
      try {
        const data = await apiFetch("/api/admin/settings", { token });
        if (!cancelled) {
          setSettings(mergeSettings(INITIAL_SETTINGS, data));
        }
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || "Ayarlar yüklenemedi", "error");
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    }

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, [authLoading, token, showToast]);

  useEffect(() => {
    setThemeDrafts((prev) => ({
      ...prev,
      primaryColor: settings.theme.primaryColor,
      secondaryColor: settings.theme.secondaryColor,
      accentColor: settings.theme.accentColor
    }));
  }, [
    settings.theme.primaryColor,
    settings.theme.secondaryColor,
    settings.theme.accentColor
  ]);

  const updateSection = (section, key, value) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateNested = (section, values) => {
    setSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values
      }
    }));
  };

  const updateTheme = (key, value) => {
    const normalized = typeof value === "string" ? value.toUpperCase() : value;
    setSettings((prev) => ({
      ...prev,
      theme: {
        ...prev.theme,
        [key]: normalized
      }
    }));
    if (typeof normalized === "string") {
      setThemeDrafts((prev) => ({ ...prev, [key]: normalized }));
      setThemeErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleNumberChange = (section, key, value) => {
    const parsed = Number(value);
    updateSection(section, key, Number.isNaN(parsed) ? 0 : parsed);
  };

  const normalizeHexDraft = (value) => {
    const raw = (value || "").toUpperCase().replace(/[^0-9A-F#]/g, "");
    const digits = raw.replace(/#/g, "");
    if (!digits.length) {
      return "#";
    }
    return `#${digits.slice(0, 6)}`;
  };

  const handleThemeHexInputChange = (key, value) => {
    const nextValue = normalizeHexDraft(value);
    setThemeDrafts((prev) => ({ ...prev, [key]: nextValue }));
    if (HEX_COLOR_REGEX.test(nextValue)) {
      updateTheme(key, nextValue);
      setThemeErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleThemeHexInputBlur = (key) => {
    const current = themeDrafts[key] || "";
    if (!HEX_COLOR_REGEX.test(current)) {
      setThemeErrors((prev) => ({
        ...prev,
        [key]: "Geçerli bir HEX değeri girin (#RRGGBB)"
      }));
      setThemeDrafts((prev) => ({ ...prev, [key]: settings.theme[key] }));
    } else {
      setThemeErrors((prev) => ({ ...prev, [key]: "" }));
      updateTheme(key, current);
    }
  };

  const createEmptyBankAccount = () => ({
    _id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `tmp-${Date.now()}`,
    bankName: "",
    accountName: "",
    iban: "",
    branch: "",
    accountNumber: "",
    description: "",
    isActive: true
  });

  const handleBankAccountChange = (index, key, value) => {
    setSettings((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        bankAccounts: prev.payment.bankAccounts.map((account, i) => {
          if (i !== index) return account;
          const nextValue = key === "iban" ? value.replace(/\s+/g, "").toUpperCase() : value;
          return {
            ...account,
            [key]: nextValue
          };
        })
      }
    }));
  };

  const handleBankAccountToggle = (index, checked) => {
    setSettings((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        bankAccounts: prev.payment.bankAccounts.map((account, i) =>
          i === index ? { ...account, isActive: checked } : account
        )
      }
    }));
  };

  const handleAddBankAccount = () => {
    setSettings((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        bankAccounts: [...prev.payment.bankAccounts, createEmptyBankAccount()]
      }
    }));
  };

  const handleRemoveBankAccount = (index) => {
    setSettings((prev) => ({
      ...prev,
      payment: {
        ...prev.payment,
        bankAccounts: prev.payment.bankAccounts.filter((_, i) => i !== index)
      }
    }));
  };

  const handleSave = async () => {
    if (!token) return;

    if (settings.payment.enableBankTransfer) {
      const validBankAccounts = (settings.payment.bankAccounts || []).filter((account) => {
        if (!account) return false;
        return account.bankName?.trim() && account.accountName?.trim() && account.iban?.trim();
      });
      if (validBankAccounts.length === 0) {
        showToast("Havale/EFT için en az bir banka hesabı ekleyin.", "error");
        return;
      }
    }

    setLoading(true);
    try {
      const payload = mergeSettings(INITIAL_SETTINGS, {
        ...settings,
        general: {
          ...settings.general,
          siteName: settings.general.siteName.trim(),
          siteDescription: settings.general.siteDescription.trim(),
          siteSlogan: settings.general.siteSlogan?.trim() || "",
          logoUrl: normalizeLogoUrl(settings.general.logoUrl),
          faviconUrl: mergeFaviconUrl(settings.general.faviconUrl)
        },
        theme: {
          ...settings.theme
        }
      });
      const updated = await apiFetch("/api/admin/settings", {
        method: "PUT",
        token,
        body: payload
      });
      setSettings(mergeSettings(INITIAL_SETTINGS, updated));
      showToast("Ayarlar başarıyla kaydedildi", "success");
    } catch (error) {
      showToast(error.message || "Ayarlar kaydedilemedi", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/admin/settings/reset", { method: "POST", token });
      const merged = mergeSettings(INITIAL_SETTINGS, data || {});
      setSettings(merged);
      setActiveTab("general");
      showToast("Ayarlar varsayılanlara sıfırlandı", "success");
    } catch (error) {
      console.error("Settings reset error:", error);
      showToast(error.message || "Ayarlar sıfırlanamadı", "error");
    } finally {
      setLoading(false);
    }
  };

  const shippingCompaniesInput = useMemo(
    () => Array.isArray(settings.shipping.shippingCompanies)
      ? settings.shipping.shippingCompanies.join("\n")
      : "",
    [settings.shipping.shippingCompanies]
  );

  if (authLoading || fetching) {
    return (
      <main className="max-w-6xl mx-auto p-4 sm:p-6">
        <Card className="p-8 text-center text-gray-600">Ayarlar yükleniyor...</Card>
      </main>
    );
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
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Site Ayarları</h1>
        <p className="text-gray-600">Sitenizin tüm ayarlarını yönetin</p>
      </div>

      <div className="mb-8 overflow-x-auto">
        <nav className="flex space-x-4 sm:space-x-8 border-b border-gray-200 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      <div className="space-y-6">
        {activeTab === "general" && (
          <div className="space-y-6">
            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Genel Ayarlar</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Adı</label>
                  <input
                    type="text"
                    value={settings.general.siteName}
                    onChange={(e) => updateSection("general", "siteName", e.target.value)}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Sloganı</label>
                  <input
                    type="text"
                    value={settings.general.siteSlogan}
                    onChange={(e) => updateSection("general", "siteSlogan", e.target.value)}
                    className="input-modern"
                    placeholder="Kaliteli ürünler, güvenilir hizmet"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Site Açıklaması</label>
                  <input
                    type="text"
                    value={settings.general.siteDescription}
                    onChange={(e) => updateSection("general", "siteDescription", e.target.value)}
                    className="input-modern"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                  <input
                    type="url"
                    value={settings.general.logoUrl}
                    onChange={(e) => updateSection("general", "logoUrl", normalizeLogoUrl(e.target.value))}
                    className="input-modern"
                    placeholder="/images/logo-placeholder.png"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Favicon URL</label>
                  <input
                    type="url"
                    value={settings.general.faviconUrl}
                    onChange={(e) => updateSection("general", "faviconUrl", mergeFaviconUrl(e.target.value))}
                    className="input-modern"
                    placeholder="/icons/icon-192.svg"
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Tema Renkleri</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: "primaryColor", label: "Ana Renk" },
                  { key: "secondaryColor", label: "İkincil Renk" },
                  { key: "accentColor", label: "Vurgu Rengi" }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={settings.theme[key]}
                        onChange={(e) => updateTheme(key, e.target.value.toUpperCase())}
                        className="h-12 w-12 cursor-pointer rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={themeDrafts[key] ?? settings.theme[key]}
                        onChange={(e) => handleThemeHexInputChange(key, e.target.value)}
                        onBlur={() => handleThemeHexInputBlur(key)}
                        className="input-modern flex-1"
                        placeholder="#000000"
                      />
                    </div>
                    {themeErrors[key] && (
                      <p className="mt-1 text-xs text-red-600">{themeErrors[key]}</p>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buton Köşe Yarıçapı ({settings.theme.buttonRadius || 0}px)
                </label>
                <input
                  type="range"
                  min={0}
                  max={30}
                  step={1}
                  value={settings.theme.buttonRadius}
                  onChange={(e) => updateTheme("buttonRadius", Number(e.target.value))}
                  className="w-full"
                />
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">İletişim Bilgileri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta</label>
                  <input
                    type="email"
                    value={settings.contact.email}
                    onChange={(e) => updateSection("contact", "email", e.target.value)}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={settings.contact.phone}
                    onChange={(e) => updateSection("contact", "phone", e.target.value)}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp</label>
                  <input
                    type="tel"
                    value={settings.contact.whatsapp}
                    onChange={(e) => updateSection("contact", "whatsapp", e.target.value)}
                    className="input-modern"
                    placeholder="+90 5xx xxx xx xx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destek Saatleri</label>
                  <input
                    type="text"
                    value={settings.contact.supportHours}
                    onChange={(e) => updateSection("contact", "supportHours", e.target.value)}
                    className="input-modern"
                    placeholder="Hafta içi 09:00 - 18:00"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                  <textarea
                    value={settings.contact.address}
                    onChange={(e) => updateSection("contact", "address", e.target.value)}
                    className="input-modern"
                    rows={3}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">Sosyal Medya</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: "facebook", label: "Facebook" },
                  { key: "instagram", label: "Instagram" },
                  { key: "twitter", label: "Twitter" },
                  { key: "linkedin", label: "LinkedIn" },
                  { key: "youtube", label: "YouTube" }
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                    <input
                      type="url"
                      value={settings.social[key] || ""}
                      onChange={(e) => updateSection("social", key, e.target.value)}
                      className="input-modern"
                      placeholder={`https://${label.toLowerCase()}.com/hesabiniz`}
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h2 className="text-xl font-semibold">SEO</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                  <input
                    type="text"
                    value={settings.seo.metaTitle}
                    onChange={(e) => updateSection("seo", "metaTitle", e.target.value)}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                  <textarea
                    value={settings.seo.metaDescription}
                    onChange={(e) => updateSection("seo", "metaDescription", e.target.value)}
                    className="input-modern"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Anahtar Kelimeler</label>
                  <input
                    type="text"
                    value={settings.seo.keywords}
                    onChange={(e) => updateSection("seo", "keywords", e.target.value)}
                    className="input-modern"
                    placeholder="e-ticaret, online alışveriş, kaliteli ürünler"
                  />
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "payment" && (
          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Iyzico API Key</label>
                <input
                  type="text"
                  value={settings.payment.iyzicoApiKey}
                  onChange={(e) => updateSection("payment", "iyzicoApiKey", e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Iyzico Secret Key</label>
                <input
                  type="password"
                  value={settings.payment.iyzicoSecretKey}
                  onChange={(e) => updateSection("payment", "iyzicoSecretKey", e.target.value)}
                  className="input-modern"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Iyzico Ortamı</label>
              <select
                value={settings.payment.iyzicoBaseUrl}
                onChange={(e) => updateSection("payment", "iyzicoBaseUrl", e.target.value)}
                className="input-modern"
              >
                <option value="https://sandbox-api.iyzipay.com">Sandbox (Test)</option>
                <option value="https://api.iyzipay.com">Production (Canlı)</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: "enableIyzico", label: "Kredi Kartı (Iyzico)" },
                { key: "enableCashOnDelivery", label: "Kapıda Ödeme" },
                { key: "enableBankTransfer", label: "Havale / EFT" }
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={Boolean(settings.payment[key])}
                    onChange={(e) => updateSection("payment", key, e.target.checked)}
                    className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                </label>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Havale / EFT Hesapları</h3>
                <Button variant="secondary" onClick={handleAddBankAccount}>
                  Yeni Hesap Ekle
                </Button>
              </div>

              {settings.payment.enableBankTransfer && settings.payment.bankAccounts.length === 0 && (
                <p className="text-sm text-orange-600">
                  Havale/EFT seçeneğini kullanabilmek için en az bir banka hesabı ekleyin.
                </p>
              )}

              {settings.payment.bankAccounts.length === 0 ? (
                <p className="text-sm text-gray-500">Henüz banka hesabı eklenmedi.</p>
              ) : (
                <div className="space-y-6">
                  {settings.payment.bankAccounts.map((account, index) => (
                    <div key={account._id || index} className="rounded-lg border border-gray-200 p-4 space-y-4">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="space-y-1">
                          <p className="font-medium text-gray-900">Hesap #{index + 1}</p>
                          {!account.isActive && (
                            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-500">
                              Pasif
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <label className="flex items-center space-x-2 text-sm text-gray-600">
                            <input
                              type="checkbox"
                              checked={Boolean(account.isActive)}
                              onChange={(e) => handleBankAccountToggle(index, e.target.checked)}
                              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                            />
                            <span>Aktif</span>
                          </label>
                          <Button variant="ghost" onClick={() => handleRemoveBankAccount(index)}>
                            Sil
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Banka Adı</label>
                          <input
                            type="text"
                            value={account.bankName}
                            onChange={(e) => handleBankAccountChange(index, "bankName", e.target.value)}
                            className="input-modern"
                            placeholder="Banka adı"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hesap Sahibi</label>
                          <input
                            type="text"
                            value={account.accountName}
                            onChange={(e) => handleBankAccountChange(index, "accountName", e.target.value)}
                            className="input-modern"
                            placeholder="Ad Soyad / Şirket"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">IBAN</label>
                          <input
                            type="text"
                            value={account.iban}
                            onChange={(e) => handleBankAccountChange(index, "iban", e.target.value)}
                            className="input-modern"
                            placeholder="TR.."
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Şube</label>
                          <input
                            type="text"
                            value={account.branch}
                            onChange={(e) => handleBankAccountChange(index, "branch", e.target.value)}
                            className="input-modern"
                            placeholder="Şube adı / kodu"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Hesap No</label>
                          <input
                            type="text"
                            value={account.accountNumber}
                            onChange={(e) => handleBankAccountChange(index, "accountNumber", e.target.value)}
                            className="input-modern"
                            placeholder="Hesap numarası"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                          <textarea
                            value={account.description || ""}
                            onChange={(e) => handleBankAccountChange(index, "description", e.target.value)}
                            className="input-modern"
                            rows={2}
                            placeholder="Ödeme açıklaması, referans bilgileri vb."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "shipping" && (
          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ücretsiz Kargo Eşiği (TL)</label>
                <input
                  type="number"
                  value={settings.shipping.freeShippingThreshold}
                  onChange={(e) => handleNumberChange("shipping", "freeShippingThreshold", e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kargo Ücreti (TL)</label>
                <input
                  type="number"
                  value={settings.shipping.shippingCost}
                  onChange={(e) => handleNumberChange("shipping", "shippingCost", e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tahmini Teslimat Süresi (gün)</label>
                <input
                  type="number"
                  value={settings.shipping.estimatedDeliveryDays}
                  onChange={(e) => handleNumberChange("shipping", "estimatedDeliveryDays", e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Varsayılan Kargo Firması</label>
                <select
                  value={settings.shipping.defaultShippingCompany}
                  onChange={(e) => updateSection("shipping", "defaultShippingCompany", e.target.value)}
                  className="input-modern"
                >
                  {settings.shipping.shippingCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kargo Firmaları (her satıra bir firma)</label>
              <textarea
                value={shippingCompaniesInput}
                onChange={(e) => {
                  const companies = e.target.value
                    .split(/\r?\n/)
                    .map((c) => c.trim())
                    .filter(Boolean);
                  const fallbackCompanies = companies.length ? companies : INITIAL_SETTINGS.shipping.shippingCompanies;
                  const nextDefault = fallbackCompanies.includes(settings.shipping.defaultShippingCompany)
                    ? settings.shipping.defaultShippingCompany
                    : fallbackCompanies[0];
                  updateNested("shipping", {
                    shippingCompanies: fallbackCompanies,
                    defaultShippingCompany: nextDefault
                  });
                }}
                className="input-modern"
                rows={4}
              />
            </div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={Boolean(settings.shipping.enableFreeShipping)}
                onChange={(e) => updateSection("shipping", "enableFreeShipping", e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Ücretsiz kargo özelliğini etkinleştir</span>
            </label>
          </Card>
        )}

        {activeTab === "email" && (
          <Card className="p-6 space-y-6">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={Boolean(settings.email.enableSmtp)}
                onChange={(e) => updateSection("email", "enableSmtp", e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">SMTP kullanarak e-posta gönder</span>
            </label>
            {smtpDisabled && (
              <p className="text-xs text-gray-500 pl-7">
                SMTP kapalıyken sistem varsayılan e-posta yöntemini kullanır. Bildirim göndermek için SMTP’yi aktif edin.
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host</label>
                <input
                  type="text"
                  value={settings.email.host}
                  onChange={(e) => updateSection("email", "host", e.target.value)}
                  className="input-modern"
                  disabled={smtpDisabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port</label>
                <input
                  type="number"
                  value={settings.email.port}
                  onChange={(e) => handleNumberChange("email", "port", e.target.value)}
                  className="input-modern"
                  disabled={smtpDisabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Kullanıcı Adı</label>
                <input
                  type="text"
                  value={settings.email.user}
                  onChange={(e) => updateSection("email", "user", e.target.value)}
                  className="input-modern"
                  disabled={smtpDisabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Şifre</label>
                <input
                  type="password"
                  value={settings.email.password}
                  onChange={(e) => updateSection("email", "password", e.target.value)}
                  className="input-modern"
                  disabled={smtpDisabled}
                />
              </div>
            </div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={Boolean(settings.email.secure)}
                onChange={(e) => updateSection("email", "secure", e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                disabled={smtpDisabled}
              />
              <span className="text-sm font-medium text-gray-700">SSL / TLS bağlantısı kullan</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gönderen E-posta</label>
                <input
                  type="email"
                  value={settings.email.fromEmail}
                  onChange={(e) => updateSection("email", "fromEmail", e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gönderen Adı</label>
                <input
                  type="text"
                  value={settings.email.fromName}
                  onChange={(e) => updateSection("email", "fromName", e.target.value)}
                  className="input-modern"
                />
              </div>
            </div>
          </Card>
        )}

        {activeTab === "analytics" && (
          <Card className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Google Analytics Measurement ID</label>
                <input
                  type="text"
                  value={settings.analytics.googleAnalyticsId}
                  onChange={(e) => updateSection("analytics", "googleAnalyticsId", e.target.value)}
                  className="input-modern"
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <label className="flex items-center space-x-3 mt-6">
                <input
                  type="checkbox"
                  checked={Boolean(settings.analytics.googleAnalyticsEnabled)}
                  onChange={(e) => updateSection("analytics", "googleAnalyticsEnabled", e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Google Analytics aktif</span>
              </label>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Facebook Pixel ID</label>
                <input
                  type="text"
                  value={settings.analytics.facebookPixelId}
                  onChange={(e) => updateSection("analytics", "facebookPixelId", e.target.value)}
                  className="input-modern"
                  placeholder="xxxxxxxxxxxxxxx"
                />
              </div>
              <label className="flex items-center space-x-3 mt-6">
                <input
                  type="checkbox"
                  checked={Boolean(settings.analytics.facebookPixelEnabled)}
                  onChange={(e) => updateSection("analytics", "facebookPixelEnabled", e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">Facebook Pixel aktif</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Canlı Destek / TawkTo ID</label>
              <input
                type="text"
                value={settings.analytics.tawkToId}
                onChange={(e) => updateSection("analytics", "tawkToId", e.target.value)}
                className="input-modern"
                placeholder="tawk_xxxxxxxxx"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Head Etiketine Eklenecek Scriptler</label>
              <textarea
                value={settings.analytics.customScriptsHead}
                onChange={(e) => updateSection("analytics", "customScriptsHead", e.target.value)}
                className="input-modern"
                rows={4}
                placeholder="<script>...</script>"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Body Sonuna Eklenecek Scriptler</label>
              <textarea
                value={settings.analytics.customScriptsBody}
                onChange={(e) => updateSection("analytics", "customScriptsBody", e.target.value)}
                className="input-modern"
                rows={4}
                placeholder="<script>...</script>"
              />
            </div>
          </Card>
        )}

        {activeTab === "notifications" && (
          <Card className="p-6 space-y-6">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={Boolean(settings.notifications.enableEmailNotifications)}
                onChange={(e) => updateSection("notifications", "enableEmailNotifications", e.target.checked)}
                className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">Sipariş sonrası e-posta bildirimlerini gönder</span>
            </label>
            {emailNotificationsDisabled && (
              <p className="text-xs text-gray-500 pl-7">
                Bildirim e-postalarını almak için bu seçeneği aktifleştirin.
              </p>
            )}
            {settings.notifications.enableEmailNotifications && smtpDisabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                SMTP kapalı olduğu için e-posta bildirimleri gönderilemeyecek. Lütfen önce SMTP ayarlarını yapılandırın.
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Yönetici Uyarı E-postası</label>
                <input
                  type="email"
                  value={settings.notifications.alertEmail}
                  onChange={(e) => updateSection("notifications", "alertEmail", e.target.value)}
                  className="input-modern"
                  placeholder="admin@anadolufenericamsanatmerkezi.com"
                  disabled={emailNotificationsDisabled}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications.lowStockAlert)}
                  onChange={(e) => updateSection("notifications", "lowStockAlert", e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  disabled={emailNotificationsDisabled}
                />
                <span className="text-sm font-medium text-gray-700">Düşük stok uyarıları gönder</span>
              </label>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={Boolean(settings.notifications.orderEmailsToAdmin)}
                  onChange={(e) => updateSection("notifications", "orderEmailsToAdmin", e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
                  disabled={emailNotificationsDisabled}
                />
                <span className="text-sm font-medium text-gray-700">Yeni siparişlerde yöneticiyi bilgilendir</span>
              </label>
            </div>
          </Card>
        )}

        <div className="flex justify-end space-x-4">
          <Button onClick={handleReset} variant="secondary" disabled={loading}>
            Sıfırla
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Kaydediliyor..." : "Kaydet"}
          </Button>
        </div>
      </div>
    </main>
  );
}

export default function SettingsPage() {
  return <SettingsPageContent />;
}
