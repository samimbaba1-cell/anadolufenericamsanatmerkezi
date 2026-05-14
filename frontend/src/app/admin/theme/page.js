"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { apiFetch } from "../../../lib/api";
import { useSiteSettings } from "../../../context/SiteSettingsContext";

const FONT_OPTIONS = ["Inter", "Poppins", "Roboto", "Open Sans", "Lato", "Montserrat", "Nunito", "Source Sans Pro"];

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

const MAIN_COLOR_KEYS = [
  { key: "primary", label: "Ana Renk" },
  { key: "secondary", label: "İkincil Renk" },
  { key: "accent", label: "Vurgu Rengi" },
  { key: "background", label: "Arka Plan" },
  { key: "surface", label: "Yüzey" }
];

const STATUS_COLOR_KEYS = [
  { key: "success", label: "Başarı" },
  { key: "warning", label: "Uyarı" },
  { key: "error", label: "Hata" },
  { key: "foreground", label: "Metin" },
  { key: "border", label: "Kenarlık" }
];

const DEFAULT_THEME_STATE = {
  colors: {
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    accent: "#F59E0B",
    background: "#FFFFFF",
    surface: "#F8FAFC",
    success: "#10B981",
    warning: "#F59E0B",
    error: "#EF4444",
    foreground: "#0F172A",
    border: "#E2E8F0"
  },
  fonts: {
    primary: "inter",
    secondary: "poppins",
    heading: "Inter"
  },
  layoutTokens: {
    headerHeight: "64px",
    footerHeight: "200px",
    maxWidth: "1280px",
    borderRadius: "8px",
    shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
  },
  animations: {
    enableAnimations: true,
    animationSpeed: "normal",
    hoverEffects: true,
    pageTransitions: true,
    duration: "300ms",
    easing: "ease-in-out"
  }
};

const normalizeHex = (value = "") => {
  const raw = value.toUpperCase().replace(/[^0-9A-F#]/g, "");
  const digits = raw.replace(/#/g, "");
  if (!digits.length) return "#";
  return `#${digits.slice(0, 6)}`;
};

const extractRadiusNumber = (value, fallback) => {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[^\d.]/g, "");
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapThemeToState = (theme = {}) => ({
  colors: {
    primary: theme.primaryColor || DEFAULT_THEME_STATE.colors.primary,
    secondary: theme.secondaryColor || DEFAULT_THEME_STATE.colors.secondary,
    accent: theme.accentColor || DEFAULT_THEME_STATE.colors.accent,
    background: theme.backgroundColor || DEFAULT_THEME_STATE.colors.background,
    surface: theme.surfaceColor || DEFAULT_THEME_STATE.colors.surface,
    success: theme.successColor || DEFAULT_THEME_STATE.colors.success,
    warning: theme.warningColor || DEFAULT_THEME_STATE.colors.warning,
    error: theme.errorColor || DEFAULT_THEME_STATE.colors.error,
    foreground: theme.foregroundColor || DEFAULT_THEME_STATE.colors.foreground,
    border: theme.borderColor || DEFAULT_THEME_STATE.colors.border
  },
  fonts: {
    primary: theme.fontFamily || DEFAULT_THEME_STATE.fonts.primary,
    secondary: theme.bodyFont || DEFAULT_THEME_STATE.fonts.secondary,
    heading: theme.headingFont || DEFAULT_THEME_STATE.fonts.heading
  },
  layoutTokens: {
    headerHeight: theme.layoutTokens?.headerHeight || DEFAULT_THEME_STATE.layoutTokens.headerHeight,
    footerHeight: theme.layoutTokens?.footerHeight || DEFAULT_THEME_STATE.layoutTokens.footerHeight,
    maxWidth: theme.layoutTokens?.maxWidth || DEFAULT_THEME_STATE.layoutTokens.maxWidth,
    borderRadius: theme.layoutTokens?.borderRadius || DEFAULT_THEME_STATE.layoutTokens.borderRadius,
    shadow: theme.layoutTokens?.shadow || DEFAULT_THEME_STATE.layoutTokens.shadow
  },
  animations: {
    enableAnimations: theme.animations?.enableAnimations ?? DEFAULT_THEME_STATE.animations.enableAnimations,
    animationSpeed: theme.animations?.animationSpeed || DEFAULT_THEME_STATE.animations.animationSpeed,
    hoverEffects: theme.animations?.hoverEffects ?? DEFAULT_THEME_STATE.animations.hoverEffects,
    pageTransitions: theme.animations?.pageTransitions ?? DEFAULT_THEME_STATE.animations.pageTransitions,
    duration: theme.animations?.duration || DEFAULT_THEME_STATE.animations.duration,
    easing: theme.animations?.easing || DEFAULT_THEME_STATE.animations.easing
  }
});

const buildThemePayload = (state) => {
  const radiusNumber = extractRadiusNumber(state.layoutTokens.borderRadius, 8);
  return {
    theme: {
      primaryColor: state.colors.primary,
      secondaryColor: state.colors.secondary,
      accentColor: state.colors.accent,
      backgroundColor: state.colors.background,
      surfaceColor: state.colors.surface,
      successColor: state.colors.success,
      warningColor: state.colors.warning,
      errorColor: state.colors.error,
      foregroundColor: state.colors.foreground,
      borderColor: state.colors.border,
      fontFamily: state.fonts.primary,
      bodyFont: state.fonts.secondary,
      headingFont: state.fonts.heading,
      buttonRadius: radiusNumber,
      layoutTokens: state.layoutTokens,
      animations: {
        enableAnimations: state.animations.enableAnimations,
        animationSpeed: state.animations.animationSpeed,
        hoverEffects: state.animations.hoverEffects,
        pageTransitions: state.animations.pageTransitions,
        duration: state.animations.duration,
        easing: state.animations.easing
      }
    }
  };
};

export default function ThemeManagementPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { refetchSettings } = useSiteSettings();

  const [themeState, setThemeState] = useState(DEFAULT_THEME_STATE);
  const [initialState, setInitialState] = useState(DEFAULT_THEME_STATE);
  const [colorErrors, setColorErrors] = useState({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (authLoading || !token) {
      return;
    }
    let cancelled = false;
    async function loadTheme() {
      setFetching(true);
      try {
        const data = await apiFetch("/api/admin/settings", { token });
        if (cancelled) return;
        const mapped = mapThemeToState(data?.theme || {});
        setThemeState(mapped);
        setInitialState(mapped);
        setColorErrors({});
      } catch (error) {
        if (!cancelled) {
          showToast(error.message || "Tema ayarları yüklenemedi", "error");
        }
      } finally {
        if (!cancelled) {
          setFetching(false);
        }
      }
    }
    loadTheme();
    return () => {
      cancelled = true;
    };
  }, [authLoading, token, showToast]);

  const isDirty = useMemo(() => JSON.stringify(themeState) !== JSON.stringify(initialState), [themeState, initialState]);

  const handleColorChange = (key, value) => {
    const normalized = normalizeHex(value);
    setThemeState((prev) => ({
      ...prev,
      colors: {
        ...prev.colors,
        [key]: normalized
      }
    }));
  };

  const handleColorBlur = (key) => {
    const value = themeState.colors[key];
    if (!HEX_COLOR_REGEX.test(value)) {
      setColorErrors((prev) => ({
        ...prev,
        [key]: "Geçerli bir HEX değeri girin (#RRGGBB)"
      }));
      setThemeState((prev) => ({
        ...prev,
        colors: {
          ...prev.colors,
          [key]: initialState.colors[key]
        }
      }));
    } else {
      setColorErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleFontChange = (key, value) => {
    setThemeState((prev) => ({
      ...prev,
      fonts: {
        ...prev.fonts,
        [key]: value
      }
    }));
  };

  const handleLayoutTokenChange = (key, value) => {
    setThemeState((prev) => ({
      ...prev,
      layoutTokens: {
        ...prev.layoutTokens,
        [key]: value
      }
    }));
  };

  const handleAnimationChange = (key, value) => {
    setThemeState((prev) => ({
      ...prev,
      animations: {
        ...prev.animations,
        [key]: value
      }
    }));
  };

  const applyToDocument = () => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    Object.entries(themeState.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  const saveTheme = async () => {
    if (!token) return;
    const invalidEntry = [...MAIN_COLOR_KEYS, ...STATUS_COLOR_KEYS].find(
      ({ key }) => !HEX_COLOR_REGEX.test(themeState.colors[key] || "")
    );
    if (invalidEntry) {
      setColorErrors((prev) => ({
        ...prev,
        [invalidEntry.key]: "Geçerli bir HEX değeri girin (#RRGGBB)"
      }));
      showToast("Lütfen geçerli renk kodları girin", "warning");
      return;
    }

    setSaving(true);
    try {
      const payload = buildThemePayload(themeState);
      const updated = await apiFetch("/api/admin/settings", {
        method: "PUT",
        token,
        body: payload
      });
      const mapped = mapThemeToState(updated?.theme || payload.theme);
      setThemeState(mapped);
      setInitialState(mapped);
      setColorErrors({});
      showToast("Tema ayarları kaydedildi", "success");
      try {
        await refetchSettings();
      } catch (e) {
        console.warn("refetchSettings", e);
      }
    } catch (error) {
      console.error("Theme save error", error);
      showToast(error.message || "Tema ayarları kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetTheme = async () => {
    if (!token) return;
    if (!window.confirm("Tema ayarlarını varsayılanlara döndürmek istediğinize emin misiniz?")) {
      return;
    }
    setResetting(true);
    try {
      const data = await apiFetch("/api/admin/settings/theme/reset", {
        method: "POST",
        token
      });
      const mapped = mapThemeToState(data || {});
      setThemeState(mapped);
      setInitialState(mapped);
      setColorErrors({});
      showToast("Tema varsayılanlara döndürüldü", "success");
      try {
        await refetchSettings();
      } catch (e) {
        console.warn("refetchSettings", e);
      }
    } catch (error) {
      console.error("Theme reset error", error);
      showToast(error.message || "Tema varsayılanlara alınamadı", "error");
    } finally {
      setResetting(false);
    }
  };

  const revertChanges = () => {
    setThemeState(initialState);
    setColorErrors({});
  };

  const copyCssVariables = () => {
    const css = `:root {
  --primary: ${themeState.colors.primary};
  --secondary: ${themeState.colors.secondary};
  --accent: ${themeState.colors.accent};
  --success: ${themeState.colors.success};
  --warning: ${themeState.colors.warning};
  --error: ${themeState.colors.error};
  --background: ${themeState.colors.background};
  --foreground: ${themeState.colors.foreground};
  --surface: ${themeState.colors.surface};
  --border: ${themeState.colors.border};
}`;
    navigator.clipboard.writeText(css).then(() => {
      showToast("CSS değişkenleri kopyalandı", "success");
    });
  };

  if (authLoading || fetching) {
    return <main className="max-w-7xl mx-auto p-6">Yükleniyor...</main>;
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
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tema Yönetimi</h1>
          <p className="text-gray-600 mt-2">Site renkleri, fontları ve düzen tokenları</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="ghost" onClick={revertChanges} disabled={!isDirty || saving || resetting}>
            Değişiklikleri Geri Al
          </Button>
          <Button variant="secondary" onClick={resetTheme} disabled={saving || resetting} loading={resetting}>
            Varsayılanlara Dön
          </Button>
          <Button onClick={saveTheme} disabled={saving || resetting} loading={saving}>
            Temayı Kaydet
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Renk Paleti</h2>
              <p className="text-sm text-gray-500">Ana renkleri ve yüzey renklerini düzenleyin</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...MAIN_COLOR_KEYS, ...STATUS_COLOR_KEYS].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={themeState.colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={themeState.colors[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      onBlur={() => handleColorBlur(key)}
                      className="input-modern flex-1"
                      placeholder="#000000"
                    />
                  </div>
                  {colorErrors[key] && <p className="mt-1 text-xs text-red-600">{colorErrors[key]}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Fontlar</h2>
              <p className="text-sm text-gray-500">Başlık ve metin fontlarını belirleyin</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { key: "primary", label: "Genel Metin" },
                { key: "secondary", label: "İkincil Metin" },
                { key: "heading", label: "Başlık" }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <select
                    value={themeState.fonts[key]}
                    onChange={(e) => handleFontChange(key, e.target.value)}
                    className="input-modern"
                  >
                    {FONT_OPTIONS.map((font) => (
                      <option key={font} value={font.toLowerCase()} style={{ fontFamily: font }}>
                        {font}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Düzen Tokenları</h2>
              <p className="text-sm text-gray-500">Header yüksekliği, maksimum genişlik vb.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { key: "headerHeight", label: "Header Yüksekliği" },
                { key: "footerHeight", label: "Footer Yüksekliği" },
                { key: "maxWidth", label: "Maksimum Genişlik" },
                { key: "borderRadius", label: "Border Radius" }
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                  <input
                    type="text"
                    value={themeState.layoutTokens[key]}
                    onChange={(e) => handleLayoutTokenChange(key, e.target.value)}
                    className="input-modern"
                  />
                </div>
              ))}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Gölge (Shadow)</label>
                <textarea
                  value={themeState.layoutTokens.shadow}
                  onChange={(e) => handleLayoutTokenChange("shadow", e.target.value)}
                  className="input-modern"
                  rows={2}
                />
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Animasyonlar</h2>
              <p className="text-sm text-gray-500">Süre, easing ve etkileşim efektleri</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Animasyon Süresi</label>
                <input
                  type="text"
                  value={themeState.animations.duration}
                  onChange={(e) => handleAnimationChange("duration", e.target.value)}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Easing</label>
                <select
                  value={themeState.animations.easing}
                  onChange={(e) => handleAnimationChange("easing", e.target.value)}
                  className="input-modern"
                >
                  <option value="ease-in-out">Ease In Out</option>
                  <option value="ease-in">Ease In</option>
                  <option value="ease-out">Ease Out</option>
                  <option value="linear">Linear</option>
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={themeState.animations.enableAnimations}
                  onChange={(e) => handleAnimationChange("enableAnimations", e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Animasyonları Etkinleştir</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={themeState.animations.hoverEffects}
                  onChange={(e) => handleAnimationChange("hoverEffects", e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Hover Efektleri</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={themeState.animations.pageTransitions}
                  onChange={(e) => handleAnimationChange("pageTransitions", e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-2 text-sm text-gray-700">Sayfa Geçişleri</span>
              </label>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Önizleme</h3>
            <div className="space-y-4">
              <div className="p-4 rounded-lg text-white" style={{ backgroundColor: themeState.colors.primary }}>
                <h4 className="font-semibold" style={{ fontFamily: themeState.fonts.heading }}>
                  Ana Renk Örneği
                </h4>
                <p className="text-sm opacity-90" style={{ fontFamily: themeState.fonts.primary }}>
                  Bu bir örnek metindir
                </p>
              </div>
              <div
                className="p-4 border rounded-lg"
                style={{
                  backgroundColor: themeState.colors.surface,
                  borderColor: themeState.colors.border,
                  color: themeState.colors.foreground
                }}
              >
                <h4 className="font-semibold" style={{ fontFamily: themeState.fonts.heading }}>
                  Kart Örneği
                </h4>
                <p className="text-sm" style={{ fontFamily: themeState.fonts.primary }}>
                  Bu bir kart örneğidir
                </p>
              </div>
              <button
                className="w-full px-4 py-2 text-white font-medium transition-colors"
                style={{
                  backgroundColor: themeState.colors.accent,
                  borderRadius: themeState.layoutTokens.borderRadius
                }}
              >
                Buton Örneği
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="flex-1" onClick={applyToDocument}>
                Önizlemeyi Uygula
              </Button>
              <Button variant="secondary" className="flex-1" onClick={copyCssVariables}>
                CSS Değişkenlerini Kopyala
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}
