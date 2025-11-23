const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function resolveMediaUrl(url, fallback = "/images/placeholder-product.jpg") {
  const candidate = url || fallback;
  if (!candidate) return fallback;
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
    return candidate;
  }
  if (candidate.startsWith("/")) {
    // Frontend public assets (e.g. /images/placeholder-product.jpg) should stay relative
    const isFrontendAsset = candidate.startsWith("/images/") || candidate.startsWith("/icons/") || candidate.startsWith("/favicons/");
    return isFrontendAsset ? candidate : `${API_URL}${candidate}`;
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
