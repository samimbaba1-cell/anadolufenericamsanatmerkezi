"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { useSiteSettings } from "../../../context/SiteSettingsContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch, getMediaUploadUrl } from "../../../lib/api";
import { normalizeLogoUrl, resolveMediaUrl } from "../../../lib/images";
import MediaPicker from "../../../components/admin/MediaPicker";

const DEFAULT_BRANDING = {
  siteName: "Anadolu Feneri Cam Sanat Merkezi",
  siteSlogan: "Kaliteli ürünler, güvenilir hizmet",
  logoUrl: "/images/logo-placeholder.png",
  faviconUrl: "/icons/icon-192.svg",
  primaryColor: "#3B82F6",
  secondaryColor: "#8B5CF6",
  accentColor: "#F59E0B",
  buttonRadius: 8
};

const THEME_KEYS = ["primaryColor", "secondaryColor", "accentColor"];
const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

const createColorDrafts = (state = DEFAULT_BRANDING) =>
  THEME_KEYS.reduce((acc, key) => {
    acc[key] = state[key];
    return acc;
  }, {});

const buildBrandingState = (general = {}, theme = {}) => ({
  siteName: general.siteName || DEFAULT_BRANDING.siteName,
  siteSlogan: general.siteSlogan || DEFAULT_BRANDING.siteSlogan,
  logoUrl: normalizeLogoUrl(general.logoUrl || DEFAULT_BRANDING.logoUrl),
  faviconUrl: general.faviconUrl || DEFAULT_BRANDING.faviconUrl,
  primaryColor: theme.primaryColor || DEFAULT_BRANDING.primaryColor,
  secondaryColor: theme.secondaryColor || DEFAULT_BRANDING.secondaryColor,
  accentColor: theme.accentColor || DEFAULT_BRANDING.accentColor,
  buttonRadius: typeof theme.buttonRadius === "number" ? theme.buttonRadius : DEFAULT_BRANDING.buttonRadius
});

const normalizeHexDraft = (value = "") => {
  const raw = value.toUpperCase().replace(/[^0-9A-F#]/g, "");
  const digits = raw.replace(/#/g, "");
  if (!digits.length) {
    return "#";
  }
  return `#${digits.slice(0, 6)}`;
};

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

export default function BrandingPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { refetchSettings } = useSiteSettings();

  const [branding, setBranding] = useState(DEFAULT_BRANDING);
  const [initialBranding, setInitialBranding] = useState(DEFAULT_BRANDING);
  const [colorDrafts, setColorDrafts] = useState(() => createColorDrafts(DEFAULT_BRANDING));
  const [colorErrors, setColorErrors] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [faviconFile, setFaviconFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    if (!faviconFile) {
      setFaviconPreview(null);
      return;
    }
    const url = URL.createObjectURL(faviconFile);
    setFaviconPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [faviconFile]);

  useEffect(() => {
    if (!token || authLoading) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await apiFetch("/api/admin/settings", { token });
        if (cancelled) return;
        const general = data?.general || {};
        const theme = data?.theme || {};
        const next = buildBrandingState(general, theme);
        setBranding(next);
        setInitialBranding(next);
        setColorDrafts(createColorDrafts(next));
        setColorErrors({});
        setLogoFile(null);
        setFaviconFile(null);
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || "Marka ayarları yüklenemedi", "error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [token, authLoading, showToast]);

  const themePreview = useMemo(() => [
    { key: "primaryColor", label: "Ana Renk", value: branding.primaryColor },
    { key: "secondaryColor", label: "İkincil Renk", value: branding.secondaryColor },
    { key: "accentColor", label: "Vurgu Rengi", value: branding.accentColor }
  ], [branding.primaryColor, branding.secondaryColor, branding.accentColor]);

  const handleRevertChanges = () => {
    setBranding(initialBranding);
    setColorDrafts(createColorDrafts(initialBranding));
    setColorErrors({});
    setLogoFile(null);
    setFaviconFile(null);
  };

  const handleColorPickerChange = (key, value) => {
    setBranding((prev) => ({ ...prev, [key]: value }));
    setColorDrafts((prev) => ({ ...prev, [key]: value }));
    setColorErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleColorHexInputChange = (key, value) => {
    const nextValue = normalizeHexDraft(value);
    setColorDrafts((prev) => ({ ...prev, [key]: nextValue }));
    if (HEX_COLOR_REGEX.test(nextValue)) {
      setBranding((prev) => ({ ...prev, [key]: nextValue }));
      setColorErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleColorHexInputBlur = (key) => {
    const current = colorDrafts[key] || "";
    if (!HEX_COLOR_REGEX.test(current)) {
      setColorErrors((prev) => ({
        ...prev,
        [key]: "Geçerli bir HEX değeri girin (#RRGGBB)"
      }));
      setColorDrafts((prev) => ({ ...prev, [key]: branding[key] || DEFAULT_BRANDING[key] }));
    } else {
      setColorErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleResetBranding = async () => {
    if (!token) return;
    if (!window.confirm("Marka ayarlarını varsayılan değerlere döndürmek istediğinize emin misiniz?")) {
      return;
    }
    setResetting(true);
    try {
      const data = await apiFetch("/api/admin/settings/branding/reset", {
        method: "POST",
        token
      });
      const next = buildBrandingState(data?.general, data?.theme);
      setBranding(next);
      setInitialBranding(next);
      setColorDrafts(createColorDrafts(next));
      setColorErrors({});
      setLogoFile(null);
      setFaviconFile(null);
      showToast("Marka ayarları varsayılanlara döndürüldü", "success");
      try {
        await refetchSettings();
      } catch (e) {
        console.warn("refetchSettings", e);
      }
    } catch (error) {
      console.error("Branding reset error", error);
      showToast(error.message || "Marka ayarları sıfırlanamadı", "error");
    } finally {
      setResetting(false);
    }
  };

  const handleSave = async () => {
    if (!token) return;
    const siteName = branding.siteName.trim();
    const siteSlogan = branding.siteSlogan.trim();
    if (!siteName || !siteSlogan) {
      showToast("Site adı ve slogana değer girin", "warning");
      setBranding((prev) => ({ ...prev, siteName, siteSlogan }));
      return;
    }
    const invalidColor = THEME_KEYS.find((key) => !HEX_COLOR_REGEX.test(branding[key] || ""));
    if (invalidColor) {
      showToast("Lütfen geçerli HEX formatında renk girin (#RRGGBB)", "warning");
      setColorErrors((prev) => ({
        ...prev,
        [invalidColor]: "Geçerli bir HEX değeri girin (#RRGGBB)"
      }));
      return;
    }
    setSaving(true);
    try {
      let logoUrl = branding.logoUrl;
      let faviconUrl = branding.faviconUrl;

      if (logoFile) {
        logoUrl = await uploadSingleFile(logoFile, token);
      }
      if (faviconFile) {
        faviconUrl = await uploadSingleFile(faviconFile, token);
      }

      const payload = {
        general: {
          siteName,
          siteSlogan,
          logoUrl: normalizeLogoUrl(logoUrl),
          faviconUrl: (faviconUrl || DEFAULT_BRANDING.faviconUrl).trim()
        },
        theme: {
          primaryColor: branding.primaryColor,
          secondaryColor: branding.secondaryColor,
          accentColor: branding.accentColor,
          buttonRadius: branding.buttonRadius
        }
      };

      const updated = await apiFetch("/api/admin/settings", {
        method: "PUT",
        token,
        body: payload
      });

      const general = updated?.general || payload.general;
      const theme = updated?.theme || payload.theme;
      const next = buildBrandingState(general, theme);
      setBranding(next);
      setInitialBranding(next);
      setColorDrafts(createColorDrafts(next));
      setColorErrors({});
      setLogoFile(null);
      setFaviconFile(null);
      showToast("Marka ayarları güncellendi", "success");
      try {
        await refetchSettings();
      } catch (e) {
        console.warn("refetchSettings", e);
      }
    } catch (error) {
      console.error("Branding save error", error);
      showToast(error.message || "Marka ayarları kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  };

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

  const currentLogoSrc = logoPreview || resolveMediaUrl(branding.logoUrl);
  const currentFaviconSrc = faviconPreview || resolveMediaUrl(branding.faviconUrl);

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Marka Yönetimi</h1>
        <p className="text-gray-600">Logo, favicon ve tema renklerini güncelleyin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Logo & Favicon</h2>
          <div className="space-y-6">
            <MediaPicker
              label="Site logosu"
              value={branding.logoUrl}
              onChange={(url) => {
                setLogoFile(null);
                setLogoPreview(null);
                setBranding((prev) => ({ ...prev, logoUrl: normalizeLogoUrl(url) }));
              }}
            />
            <MediaPicker
              label="Favicon"
              value={branding.faviconUrl}
              onChange={(url) => {
                setFaviconFile(null);
                setFaviconPreview(null);
                setBranding((prev) => ({ ...prev, faviconUrl: url || DEFAULT_BRANDING.faviconUrl }));
              }}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-semibold">Site Bilgileri</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Adı</label>
              <input
                type="text"
                value={branding.siteName}
                onChange={(e) => setBranding((prev) => ({ ...prev, siteName: e.target.value }))}
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Sloganı</label>
              <input
                type="text"
                value={branding.siteSlogan}
                onChange={(e) => setBranding((prev) => ({ ...prev, siteSlogan: e.target.value }))}
                className="input-modern"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">Renkler</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {themePreview.map(({ key, label, value }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-2">{label}</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={branding[key]}
                      onChange={(e) => handleColorPickerChange(key, e.target.value)}
                      className="h-12 w-12 cursor-pointer rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={colorDrafts[key]}
                      onChange={(e) => handleColorHexInputChange(key, e.target.value)}
                      onBlur={() => handleColorHexInputBlur(key)}
                      className="input-modern flex-1"
                      placeholder="#000000"
                    />
                  </div>
                  {colorErrors[key] && (
                    <p className="mt-1 text-xs text-red-600">{colorErrors[key]}</p>
                  )}
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">
                Buton Köşe Yarıçapı ({branding.buttonRadius}px)
              </label>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={branding.buttonRadius}
                onChange={(e) => setBranding((prev) => ({ ...prev, buttonRadius: Number(e.target.value) }))}
                className="w-full"
              />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Önizleme</h2>
        <div className="rounded-lg border bg-gray-50 p-4">
          <div className="mb-4 flex items-center gap-3">
            {branding.logoUrl ? (
              <Image
                src={currentLogoSrc}
                alt="Logo"
                width={48}
                height={48}
                className="rounded object-contain"
                unoptimized
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded bg-blue-600 text-white font-semibold">
                {branding.siteName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h3 className="text-lg font-semibold" style={{ color: branding.primaryColor }}>
                {branding.siteName || "Site adı"}
              </h3>
              <p className="text-sm text-gray-600">{branding.siteSlogan || "Slogan"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {themePreview.map(({ key, label, value }) => (
              <div key={key} className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 rounded-full border border-white shadow" style={{ backgroundColor: value }} />
                <span className="text-xs text-gray-600">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-white" style={{ backgroundColor: branding.accentColor, borderRadius: `${branding.buttonRadius}px` }}>
            Buton örneği
          </div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-end gap-3">
        <Button variant="ghost" onClick={handleRevertChanges} disabled={saving || resetting}>
          Değişiklikleri Geri Al
        </Button>
        <Button variant="secondary" onClick={handleResetBranding} disabled={saving || resetting}>
          {resetting ? "Varsayılanlar yükleniyor..." : "Varsayılanlara Dön"}
        </Button>
        <Button onClick={handleSave} disabled={saving || resetting}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </main>
  );
}
