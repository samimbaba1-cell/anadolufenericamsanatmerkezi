"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";
import { useSiteSettings } from "../../../context/SiteSettingsContext";

const THEMES = [
  {
    id: "modern-blue",
    name: "Modern Mavi",
    colors: {
      primary: "#3B82F6",
      secondary: "#64748B",
      accent: "#F59E0B",
      background: "#FFFFFF",
      surface: "#F8FAFC"
    }
  },
  {
    id: "elegant-purple",
    name: "Elegant Mor",
    colors: {
      primary: "#8B5CF6",
      secondary: "#6B7280",
      accent: "#F59E0B",
      background: "#FFFFFF",
      surface: "#FAF5FF"
    }
  },
  {
    id: "warm-orange",
    name: "Sıcak Turuncu",
    colors: {
      primary: "#F97316",
      secondary: "#64748B",
      accent: "#EAB308",
      background: "#FFFFFF",
      surface: "#FFF7ED"
    }
  },
  {
    id: "nature-green",
    name: "Doğa Yeşili",
    colors: {
      primary: "#10B981",
      secondary: "#6B7280",
      accent: "#F59E0B",
      background: "#FFFFFF",
      surface: "#F0FDF4"
    }
  },
  {
    id: "luxury-gold",
    name: "Lüks Altın",
    colors: {
      primary: "#D97706",
      secondary: "#6B7280",
      accent: "#FBBF24",
      background: "#FFFFFF",
      surface: "#FFFBEB"
    }
  },
  {
    id: "minimal-gray",
    name: "Minimal Gri",
    colors: {
      primary: "#374151",
      secondary: "#6B7280",
      accent: "#3B82F6",
      background: "#FFFFFF",
      surface: "#F9FAFB"
    }
  }
];

const FONTS = [
  { id: "inter", name: "Inter", class: "font-inter" },
  { id: "poppins", name: "Poppins", class: "font-poppins" },
  { id: "roboto", name: "Roboto", class: "font-roboto" },
  { id: "opensans", name: "Open Sans", class: "font-opensans" },
  { id: "lato", name: "Lato", class: "font-lato" },
  { id: "montserrat", name: "Montserrat", class: "font-montserrat" }
];

const FONT_MAP = FONTS.reduce((acc, font) => {
  acc[font.id] = font;
  return acc;
}, {});

const DEFAULT_COLORS = {
  primary: "#3B82F6",
  secondary: "#64748B",
  accent: "#F59E0B",
  background: "#FFFFFF",
  surface: "#F8FAFC"
};

const DEFAULT_LAYOUT = {
  headerStyle: "default",
  footerStyle: "default",
  sidebarPosition: "right",
  productGrid: "4-columns",
  cardStyle: "default",
  buttonStyle: "rounded",
  borderRadius: "medium",
  shadow: "medium"
};

const DEFAULT_ANIMATIONS = {
  enableAnimations: true,
  animationSpeed: "normal",
  hoverEffects: true,
  pageTransitions: true
};

const BORDER_RADIUS_MAP = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16
};

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{6})$/;

const normalizeHexDraft = (value = "") => {
  const raw = value.toUpperCase().replace(/[^0-9A-F#]/g, "");
  const digits = raw.replace(/#/g, "");
  if (!digits.length) {
    return "#";
  }
  return `#${digits.slice(0, 6)}`;
};

const createDefaultDesignState = () => ({
  activePreset: "modern-blue",
  font: "inter",
  colors: { ...DEFAULT_COLORS },
  layout: { ...DEFAULT_LAYOUT },
  animations: { ...DEFAULT_ANIMATIONS },
  buttonRadius: BORDER_RADIUS_MAP.medium
});

const inferPreset = (colors) => {
  const found = THEMES.find((theme) =>
    Object.entries(theme.colors).every(
      ([key, value]) => (colors[key] || "").toUpperCase() === value.toUpperCase()
    )
  );
  return found ? found.id : "custom";
};

const getBorderKeyFromRadius = (radius) => {
  const match = Object.entries(BORDER_RADIUS_MAP).find(([, value]) => value === radius);
  return match ? match[0] : "medium";
};

const mapThemeToState = (theme = {}) => {
  const colors = {
    primary: theme.primaryColor || DEFAULT_COLORS.primary,
    secondary: theme.secondaryColor || DEFAULT_COLORS.secondary,
    accent: theme.accentColor || DEFAULT_COLORS.accent,
    background: theme.backgroundColor || DEFAULT_COLORS.background,
    surface: theme.surfaceColor || DEFAULT_COLORS.surface
  };

  const layout = {
    ...DEFAULT_LAYOUT,
    ...(theme.layout || {})
  };

  if (!layout.borderRadius && typeof theme.buttonRadius === "number") {
    layout.borderRadius = getBorderKeyFromRadius(theme.buttonRadius);
  }

  const animations = {
    ...DEFAULT_ANIMATIONS,
    ...(theme.animations || {})
  };

  return {
    activePreset: theme.activePreset || inferPreset(colors),
    font: theme.fontFamily || "inter",
    colors,
    layout,
    animations,
    buttonRadius: typeof theme.buttonRadius === "number" ? theme.buttonRadius : BORDER_RADIUS_MAP.medium
  };
};

const buildThemePayload = (state) => {
  const borderRadiusKey = state.layout.borderRadius || "medium";
  const buttonRadius = BORDER_RADIUS_MAP[borderRadiusKey] ?? state.buttonRadius ?? BORDER_RADIUS_MAP.medium;
  const font = FONT_MAP[state.font] || FONT_MAP.inter;
  const normalizedColors = Object.fromEntries(
    Object.entries(state.colors).map(([key, value]) => [key, (value || "").toUpperCase()])
  );

  return {
    activePreset: state.activePreset,
    fontFamily: state.font,
    headingFont: font?.name || "Inter",
    bodyFont: font?.name || "Inter",
    primaryColor: normalizedColors.primary,
    secondaryColor: normalizedColors.secondary,
    accentColor: normalizedColors.accent,
    backgroundColor: normalizedColors.background,
    surfaceColor: normalizedColors.surface,
    buttonRadius,
    layout: state.layout,
    animations: state.animations
  };
};

export default function DesignPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { refetchSettings } = useSiteSettings();

  const [design, setDesign] = useState(() => createDefaultDesignState());
  const [initialDesign, setInitialDesign] = useState(() => createDefaultDesignState());
  const [colorDrafts, setColorDrafts] = useState(() => ({ ...DEFAULT_COLORS }));
  const [colorErrors, setColorErrors] = useState({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

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
        setDesign(mapped);
        setInitialDesign(mapped);
        setColorDrafts(mapped.colors);
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

  const isDirty = useMemo(() => JSON.stringify(design) !== JSON.stringify(initialDesign), [design, initialDesign]);

  const handlePresetSelect = (themeId) => {
    const preset = THEMES.find((item) => item.id === themeId);
    if (!preset) return;
    const nextState = {
      ...design,
      activePreset: themeId,
      colors: { ...design.colors, ...preset.colors }
    };
    setDesign(nextState);
    setColorDrafts((prev) => ({ ...prev, ...preset.colors }));
    setColorErrors({});
    if (token) {
      void persistTheme(nextState, "Tema kaydedildi; ana site renkleri güncellendi");
    }
  };

  const handleFontSelect = (fontId) => {
    const nextState = { ...design, font: fontId };
    setDesign(nextState);
    if (token) {
      void persistTheme(nextState, "Yazı tipi kaydedildi");
    }
  };

  const handleColorPickerChange = (key, value) => {
    setColorDrafts((prev) => ({ ...prev, [key]: value }));
    setColorErrors((prev) => ({ ...prev, [key]: "" }));
    setDesign((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: value }
    }));
  };

  const handleColorHexChange = (key, value) => {
    const nextValue = normalizeHexDraft(value);
    setColorDrafts((prev) => ({ ...prev, [key]: nextValue }));
    if (HEX_COLOR_REGEX.test(nextValue)) {
      setDesign((prev) => ({
        ...prev,
        activePreset: "custom",
        colors: { ...prev.colors, [key]: nextValue }
      }));
      setColorErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleColorHexBlur = (key) => {
    const current = colorDrafts[key] || "";
    if (!HEX_COLOR_REGEX.test(current)) {
      setColorErrors((prev) => ({
        ...prev,
        [key]: "Geçerli bir HEX değeri girin (#RRGGBB)"
      }));
      setColorDrafts((prev) => ({ ...prev, [key]: design.colors[key] || DEFAULT_COLORS[key] }));
    } else {
      setColorErrors((prev) => ({ ...prev, [key]: "" }));
    }
  };

  const handleLayoutChange = (key, value) => {
    setDesign((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: value
      }
    }));
  };

  const handleAnimationChange = (key, value) => {
    setDesign((prev) => ({
      ...prev,
      animations: {
        ...prev.animations,
        [key]: value
      }
    }));
  };

  const hasInvalidColors = (state) => {
    const invalidEntry = Object.entries(state.colors).find(([, value]) => !HEX_COLOR_REGEX.test(value || ""));
    if (!invalidEntry) {
      return null;
    }
    const [key] = invalidEntry;
    return key;
  };

  const persistTheme = async (nextState = design, successMessage = "Tema ayarları kaydedildi") => {
    if (!token) return;
    const invalidKey = hasInvalidColors(nextState);
    if (invalidKey) {
      setColorErrors((prev) => ({
        ...prev,
        [invalidKey]: "Geçerli bir HEX değeri girin (#RRGGBB)"
      }));
      showToast("Lütfen geçerli renk kodları girin", "warning");
      return;
    }

    setSaving(true);
    try {
      const themePayload = buildThemePayload(nextState);
      const updated = await apiFetch("/api/admin/settings", {
        method: "PUT",
        token,
        body: { theme: themePayload }
      });
      const mapped = mapThemeToState(updated?.theme || themePayload);
      setDesign(mapped);
      setInitialDesign(mapped);
      setColorDrafts(mapped.colors);
      setColorErrors({});
      showToast(successMessage, "success");
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

  const handleApplyCustomColors = () => {
    const nextState = { ...design, activePreset: "custom" };
    setDesign(nextState);
    persistTheme(nextState, "Özel renkler kaydedildi");
  };

  const handleLayoutSave = () => {
    persistTheme(design, "Layout ayarları kaydedildi");
  };

  const handleAnimationSave = () => {
    persistTheme(design, "Animasyon ayarları kaydedildi");
  };

  const handleResetToDefault = async () => {
    if (!token) return;
    if (!window.confirm("Tüm tasarım ayarlarını varsayılana sıfırlamak istediğinize emin misiniz?")) {
      return;
    }
    setResetting(true);
    try {
      const defaults = await apiFetch("/api/admin/settings/theme/reset", {
        method: "POST",
        token
      });
      const mapped = mapThemeToState(defaults);
      setDesign(mapped);
      setInitialDesign(mapped);
      setColorDrafts(mapped.colors);
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

  const handleRevertChanges = () => {
    setDesign(initialDesign);
    setColorDrafts(initialDesign.colors);
    setColorErrors({});
  };

  const togglePreview = () => {
    setIsPreviewMode((prev) => !prev);
  };

  if (authLoading || fetching) {
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
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Tasarım Yönetimi</h1>
        <p className="text-gray-600">Sitenizin görünümünü özelleştirin</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Canlı Önizleme</h3>
            <p className="text-sm text-gray-600">Değişiklikleri gerçek zamanlı olarak görün</p>
          </div>
          <Button onClick={togglePreview} variant={isPreviewMode ? "secondary" : "primary"}>
            {isPreviewMode ? "Önizlemeyi Kapat" : "Önizlemeyi Aç"}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-2">Hazır Temalar</h2>
        <p className="text-sm text-gray-600 mb-4">
          Bir temaya tıkladığınızda kayıt sunucuya gider ve mağaza (butonlar, bağlantılar, vurgular) anında güncellenir.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                design.activePreset === theme.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
              onClick={() => handlePresetSelect(theme.id)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.primary }} />
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.secondary }} />
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: theme.colors.accent }} />
              </div>
              <h3 className="font-medium">{theme.name}</h3>
              <p className="text-sm text-gray-600">Modern ve şık tasarım</p>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Yazı Tipi</h2>
        <div className="space-y-3">
          {FONTS.map((font) => (
            <button
              key={font.id}
              type="button"
              onClick={() => handleFontSelect(font.id)}
              className={`w-full p-3 border rounded-lg text-left transition-all ${
                design.font === font.id ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <span className={`${font.class} text-lg`}>{font.name} - ABC abc 123</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-2">Özel Renkler</h2>
          <p className="text-sm text-gray-500">HEX kodlarını girerek renk paletinizi özelleştirin</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Object.entries(colorDrafts).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 capitalize mb-2">
                {key === "primary"
                  ? "Ana Renk"
                  : key === "secondary"
                    ? "İkincil Renk"
                    : key === "accent"
                      ? "Vurgu Rengi"
                      : key === "background"
                        ? "Arka Plan"
                        : "Yüzey Rengi"}
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorPickerChange(key, e.target.value)}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleColorHexChange(key, e.target.value)}
                  onBlur={() => handleColorHexBlur(key)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="#000000"
                />
              </div>
              {colorErrors[key] && <p className="mt-1 text-xs text-red-600">{colorErrors[key]}</p>}
            </div>
          ))}
        </div>
        <Button onClick={handleApplyCustomColors} disabled={saving || resetting}>
          {saving ? "Kaydediliyor..." : "Özel Renkleri Kaydet"}
        </Button>
      </Card>

      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Layout Ayarları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            ["headerStyle", "Header Stili", ["default", "minimal", "centered"]],
            ["footerStyle", "Footer Stili", ["default", "minimal", "detailed"]],
            ["sidebarPosition", "Sidebar Pozisyonu", ["left", "right", "none"]],
            ["productGrid", "Ürün Grid", ["2-columns", "3-columns", "4-columns", "5-columns"]],
            ["cardStyle", "Kart Stili", ["default", "minimal", "detailed", "card"]],
            ["buttonStyle", "Buton Stili", ["rounded", "square", "pill"]],
            ["borderRadius", "Köşe Yuvarlaklığı", ["none", "small", "medium", "large"]],
            ["shadow", "Gölge", ["none", "small", "medium", "large"]]
          ].map(([key, label, options]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
              <select
                value={design.layout[key]}
                onChange={(e) => handleLayoutChange(key, e.target.value)}
                className="input-modern"
              >
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option === "default"
                      ? "Varsayılan"
                      : option === "minimal"
                        ? "Minimal"
                        : option === "centered"
                          ? "Ortalanmış"
                          : option === "detailed"
                            ? "Detaylı"
                            : option === "left"
                              ? "Sol"
                              : option === "right"
                                ? "Sağ"
                                : option === "none"
                                  ? "Yok"
                                  : option === "card"
                                    ? "Kart"
                                    : option === "rounded"
                                      ? "Yuvarlatılmış"
                                      : option === "square"
                                        ? "Kare"
                                        : option === "pill"
                                          ? "Hap"
                                          : option === "large"
                                            ? "Büyük"
                                            : option === "small"
                                              ? "Küçük"
                                              : option === "medium"
                                                ? "Orta"
                                                : option === "2-columns"
                                                  ? "2 Sütun"
                                                  : option === "3-columns"
                                                    ? "3 Sütun"
                                                    : option === "4-columns"
                                                      ? "4 Sütun"
                                                      : option === "5-columns"
                                                        ? "5 Sütun"
                                                        : option}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <Button onClick={handleLayoutSave} disabled={saving || resetting}>
          {saving ? "Kaydediliyor..." : "Layout Ayarlarını Kaydet"}
        </Button>
      </Card>

      <Card className="p-6 space-y-6">
        <h2 className="text-xl font-semibold">Animasyon Ayarları</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Animasyonları Etkinleştir</p>
              <p className="text-xs text-gray-500">Sayfa geçişleri ve hover efektleri</p>
            </div>
            <input
              type="checkbox"
              checked={design.animations.enableAnimations}
              onChange={(e) => handleAnimationChange("enableAnimations", e.target.checked)}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Hover Efektleri</p>
              <p className="text-xs text-gray-500">Kartlar ve butonlarda animasyon</p>
            </div>
            <input
              type="checkbox"
              checked={design.animations.hoverEffects}
              onChange={(e) => handleAnimationChange("hoverEffects", e.target.checked)}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Sayfa Geçişleri</p>
              <p className="text-xs text-gray-500">Sayfa değişimlerinde animasyon</p>
            </div>
            <input
              type="checkbox"
              checked={design.animations.pageTransitions}
              onChange={(e) => handleAnimationChange("pageTransitions", e.target.checked)}
              className="w-4 h-4 text-primary focus:ring-primary border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Animasyon Hızı</label>
            <select
              value={design.animations.animationSpeed}
              onChange={(e) => handleAnimationChange("animationSpeed", e.target.value)}
              className="input-modern"
            >
              <option value="slow">Yavaş</option>
              <option value="normal">Normal</option>
              <option value="fast">Hızlı</option>
            </select>
          </div>
        </div>
        <Button onClick={handleAnimationSave} disabled={saving || resetting}>
          {saving ? "Kaydediliyor..." : "Animasyon Ayarlarını Kaydet"}
        </Button>
      </Card>

      {isPreviewMode && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Tasarım Önizlemesi</h2>
          <div className="rounded-lg border bg-gray-50 p-6">
            <div
              className="rounded-lg shadow-sm p-6"
              style={{ backgroundColor: design.colors.background, color: design.colors.secondary }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: design.colors.primary }}
                  >
                    AF
                  </div>
                  <span className="text-xl font-bold" style={{ color: design.colors.secondary }}>
                    Anadolu Feneri Cam Sanat Merkezi
                  </span>
                </div>
                <div className="flex space-x-3">
                  <button
                    className="px-4 py-2 text-white rounded-lg"
                    style={{
                      backgroundColor: design.colors.primary,
                      borderRadius: `${BORDER_RADIUS_MAP[design.layout.borderRadius] ?? 8}px`
                    }}
                  >
                    Ürünleri Keşfet
                  </button>
                  <button
                    className="px-4 py-2 border rounded-lg"
                    style={{
                      borderColor: design.colors.secondary,
                      color: design.colors.secondary,
                      borderRadius: `${BORDER_RADIUS_MAP[design.layout.borderRadius] ?? 8}px`
                    }}
                  >
                    Kampanyalar
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-32 rounded-lg" style={{ backgroundColor: design.colors.surface }} />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Genel İşlemler</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={handleRevertChanges} disabled={!isDirty || saving || resetting}>
            Değişiklikleri Geri Al
          </Button>
          <Button variant="secondary" onClick={handleResetToDefault} disabled={saving || resetting} loading={resetting}>
            Varsayılanlara Dön
          </Button>
          <Button onClick={() => persistTheme()} disabled={saving || resetting} loading={saving}>
            Tüm Ayarları Kaydet
          </Button>
        </div>
      </Card>
    </main>
  );
}

