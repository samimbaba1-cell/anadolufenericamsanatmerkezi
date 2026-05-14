import { getPublicApiOriginForClient } from './api-base';

/** Medya yolları (/uploads/...) için API kökü — LAN + loopback env düzeltmesi */
function mediaApiOrigin() {
  if (typeof window !== 'undefined') {
    return getPublicApiOriginForClient().replace(/\/+$/, '');
  }
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv != null && String(fromEnv).trim() !== '') {
    return String(fromEnv).replace(/\/+$/, '');
  }
  return (process.env.INTERNAL_API_URL || process.env.NEXT_DEV_BACKEND_BASE || 'http://127.0.0.1:3000').replace(/\/+$/, '');
}
export function resolveMediaUrl(url, fallback = "/images/placeholder-product.jpg") {
  const candidate = url || fallback;
  if (!candidate) return fallback;
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }
  if (candidate.startsWith("/")) {
    // Frontend public assets (e.g. /images/placeholder-product.jpg) should stay relative
    const isFrontendAsset = candidate.startsWith("/images/") || candidate.startsWith("/icons/") || candidate.startsWith("/favicons/");
    return isFrontendAsset ? candidate : `${mediaApiOrigin()}${candidate}`;
  }
  return candidate;
}

export function normalizeLogoUrl(url) {
  if (!url) return "/images/logo-placeholder.png";
  const trimmed = url.trim();
  if (!trimmed) return "/images/logo-placeholder.png";
  const lower = trimmed.toLowerCase();
  if (lower === "/logo-placeholder.png" || lower.includes("logo-placeholder.png")) {
    return "/images/logo-placeholder.png";
  }
  return trimmed;
}
