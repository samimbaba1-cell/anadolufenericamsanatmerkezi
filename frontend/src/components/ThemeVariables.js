"use client";

import { useEffect } from "react";
import { useSiteSettings } from "../context/SiteSettingsContext";

function hexToRgb(hex) {
  if (!hex || typeof hex !== "string") return null;
  let h = hex.trim().replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return null;
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[clamp(r), clamp(g), clamp(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")}`;
}

function darkenHex(hex, factor = 0.78) {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#2563eb";
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  if (!a || !b) return hexA || hexB || "#f8fafc";
  const u = Math.max(0, Math.min(1, t));
  return rgbToHex(a.r + (b.r - a.r) * u, a.g + (b.g - a.g) * u, a.b + (b.b - a.b) * u);
}

function hexToRgba(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(59, 130, 246, ${alpha})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

const FONT_STACK = {
  inter: 'var(--font-inter, ui-sans-serif), system-ui, sans-serif',
  poppins: 'var(--font-poppins, ui-sans-serif), system-ui, sans-serif',
  roboto: 'var(--font-roboto, ui-sans-serif), system-ui, sans-serif',
  opensans: 'var(--font-opensans, ui-sans-serif), system-ui, sans-serif',
  lato: 'var(--font-lato, ui-sans-serif), system-ui, sans-serif',
  montserrat: 'var(--font-montserrat, ui-sans-serif), system-ui, sans-serif'
};

/**
 * Site ayarlarındaki tema → :root CSS değişkenleri (Tailwind theme.extend.colors ile uyumlu).
 */
export default function ThemeVariables() {
  const { theme, loading } = useSiteSettings();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (loading) return;

    const t = theme || {};
    const primary = t.primaryColor || "#3B82F6";
    const primaryDark = darkenHex(primary);
    const secondary = t.secondaryColor || "#64748B";
    const accent = t.accentColor || "#F59E0B";
    const background = t.backgroundColor || "#FFFFFF";
    const surface = t.surfaceColor || "#F8FAFC";
    const foreground = t.foregroundColor || "#0F172A";
    const border = t.borderColor || "#E2E8F0";
    const success = t.successColor || "#10B981";
    const warning = t.warningColor || "#F59E0B";
    const error = t.errorColor || "#EF4444";

    const root = document.documentElement;
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--primary-dark", primaryDark);
    root.style.setProperty("--secondary", secondary);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--background", background);
    root.style.setProperty("--surface", surface);
    root.style.setProperty("--foreground", foreground);
    root.style.setProperty("--border", border);
    root.style.setProperty("--success", success);
    root.style.setProperty("--warning", warning);
    root.style.setProperty("--error", error);
    root.style.setProperty("--gradient-primary", `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`);
    root.style.setProperty("--gradient-hero", `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
    root.style.setProperty(
      "--gradient-logo",
      `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${primaryDark} 100%)`
    );
    root.style.setProperty(
      "--storefront-bg",
      `linear-gradient(to bottom right, ${mixHex(surface, primary, 0.16)} 0%, ${mixHex(surface, secondary, 0.1)} 42%, ${surface} 100%)`
    );
    root.style.setProperty(
      "--auth-shell-bg",
      `linear-gradient(to bottom right, ${mixHex(background, primary, 0.14)} 0%, ${background} 40%, ${mixHex(background, secondary, 0.12)} 100%)`
    );
    root.style.setProperty(
      "--section-muted-bg",
      `linear-gradient(to bottom right, ${mixHex(surface, primary, 0.09)} 0%, ${mixHex(surface, secondary, 0.07)} 100%)`
    );
    root.style.setProperty(
      "--hero-fallback-overlay",
      `linear-gradient(90deg, ${hexToRgba(primary, 0.92)} 0%, ${hexToRgba(secondary, 0.88)} 100%)`
    );
    root.style.setProperty(
      "--footer-gradient",
      `linear-gradient(135deg, ${mixHex("#0f172a", primary, 0.42)} 0%, #0f172a 52%, #020617 100%)`
    );
    root.style.setProperty(
      "--hero-fallback-blob",
      hexToRgba(accent, 0.22)
    );
    root.style.setProperty(
      "--hero-heading-gradient",
      `linear-gradient(to right, #ffffff, ${mixHex("#ffffff", primary, 0.28)})`
    );
    root.style.setProperty("--hero-subtitle-color", mixHex("#ffffff", primary, 0.18));

    const fontKey = (t.fontFamily || "inter").toLowerCase();
    document.body.style.fontFamily = FONT_STACK[fontKey] || FONT_STACK.inter;

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && /^#[0-9A-Fa-f]{6}$/.test(primary)) {
      meta.setAttribute("content", primary);
    }
  }, [theme, loading]);

  return null;
}
