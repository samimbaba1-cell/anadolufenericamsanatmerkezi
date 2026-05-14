/**
 * Açık NEXT_PUBLIC_API_URL varsa: doğrudan o köke istek.
 * Yoksa: tarayıcıda boş dön = /api/... aynı origin (dev rewrites, prod reverse proxy).
 * Sunucu (sitemap, metadata): development’ta next.config’den NEXT_DEV_BACKEND_BASE
 * (../backend/.env PORT ile aynı); yoksa INTERNAL veya 127.0.0.1:3000.
 */
function devBackendFallback() {
  const devBase = process.env.NEXT_DEV_BACKEND_BASE;
  if (process.env.NODE_ENV === "development" && devBase && String(devBase).trim() !== "") {
    return String(devBase).replace(/\/+$/, "");
  }
  return (process.env.INTERNAL_API_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv != null && String(fromEnv).trim() !== "") {
    return String(fromEnv).replace(/\/+$/, "");
  }
  if (typeof window !== "undefined") {
    return "";
  }
  return devBackendFallback();
}

const DEFAULT_API_URL = devBackendFallback();
export { DEFAULT_API_URL };

/**
 * Tarayıcıda API kökü: NEXT_PUBLIC_API_URL boşsa "" (aynı origin + /api rewrite / reverse proxy).
 * Env localhost/127.0.0.1 iken sayfa LAN IP ile açıldıysa "" döner (istemci kendi loopback'ine vurmasın).
 */
export function getBrowserApiBase() {
  if (typeof window === "undefined") {
    return getApiBaseUrl().replace(/\/+$/, "");
  }
  const raw = getApiBaseUrl().replace(/\/+$/, "");
  if (!raw) return "";
  try {
    const { hostname } = new URL(raw.startsWith("http") ? raw : `http://${raw}`);
    const loopback = hostname === "localhost" || hostname === "127.0.0.1";
    const pageLoopback =
      window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (loopback && !pageLoopback) return "";
  } catch {
    return "";
  }
  return raw;
}

/**
 * Feed ve istemci fetch için kök: tarayıcıda aynı mantık (LAN + loopback env düzeltmesi).
 * SSR’de env / dev backend kökü.
 */
export function getPublicApiOriginForClient() {
  if (typeof window !== "undefined") {
    const fromEnv = process.env.NEXT_PUBLIC_API_URL;
    if (fromEnv != null && String(fromEnv).trim() !== "") {
      const trimmed = String(fromEnv).replace(/\/+$/, "");
      try {
        const { hostname } = new URL(trimmed.startsWith("http") ? trimmed : `http://${trimmed}`);
        const loopback = hostname === "localhost" || hostname === "127.0.0.1";
        const pageLoopback =
          window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (loopback && !pageLoopback) {
          return window.location.origin.replace(/\/+$/, "");
        }
      } catch {
        return window.location.origin.replace(/\/+$/, "");
      }
      return trimmed;
    }
    return window.location.origin.replace(/\/+$/, "");
  }
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv != null && String(fromEnv).trim() !== "") {
    return String(fromEnv).replace(/\/+$/, "");
  }
  const devBase = process.env.NEXT_DEV_BACKEND_BASE;
  if (process.env.NODE_ENV === "development" && devBase && String(devBase).trim() !== "") {
    return String(devBase).replace(/\/+$/, "");
  }
  return devBackendFallback();
}
