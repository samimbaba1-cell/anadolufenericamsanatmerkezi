"use client";

import { getApiBaseUrl as getBaseUrl, getBrowserApiBase } from "./api-base";

export function getApiBaseUrl() {
  return getBaseUrl();
}

function resolveClientFetchBase() {
  if (typeof window === "undefined") return getBaseUrl();
  return getBrowserApiBase();
}

/** FormData ile dosya yükleme — base boşsa Next /api rewrite (aynı origin). */
export function getMediaUploadUrl() {
  const b = resolveClientFetchBase();
  if (!b) return "/api/media/upload";
  return `${String(b).replace(/\/+$/, "")}/api/media/upload`;
}

/** Blob/indirme için tam veya göreli API yolu. */
export function getAbsoluteApiUrl(path) {
  const pathPart = path.startsWith("/") ? path : `/${path}`;
  const b = resolveClientFetchBase();
  return b ? `${String(b).replace(/\/+$/, "")}${pathPart}` : pathPart;
}

export async function apiFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  try {
    const apiBaseUrl = resolveClientFetchBase();
    const pathPart = path.startsWith("/") ? path : `/${path}`;
    const url = apiBaseUrl ? `${apiBaseUrl}${pathPart}` : pathPart;
    console.log(`[apiFetch] ${method} ${url}`, { hasToken: !!token });
    
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    
    console.log(`[apiFetch] Response status: ${res.status} for ${url}`);
    
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      let errorData = null;
      try { 
        errorData = await res.json(); 
        if (errorData?.message) message = errorData.message;
        else if (errorData?.error) message = errorData.error;
      } catch (_) {
        const text = await res.text().catch(() => '');
        console.error(`[apiFetch] Error response text:`, text);
      }
      
      // Specific error handling
      if (res.status === 400 && Array.isArray(errorData?.details)) {
        const detailMsg = errorData.details
          .map((d) => d.msg || d.message)
          .filter(Boolean)
          .join(" · ");
        if (detailMsg) message = detailMsg;
      } else if (res.status === 401) {
        message = "Oturum süresi doldu. Lütfen tekrar giriş yapın.";
        // Otomatik logout - token'ı temizle
        if (typeof window !== "undefined") {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          // Sayfayı login sayfasına yönlendir
          if (window.location.pathname !== "/login" && window.location.pathname !== "/register") {
            window.location.href = "/login?expired=true";
          }
        }
      } else if (res.status === 403) {
        message = "Bu işlem için yetkiniz bulunmuyor.";
      } else if (res.status === 404) {
        message =
          errorData?.error ||
          errorData?.message ||
          `Aranan kaynak bulunamadı: ${path}`;
        console.error(`[apiFetch] 404 Error - Path: ${path}, Full URL: ${url}`);
      } else if (res.status === 500) {
        message = errorData?.error || "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
      }
      
      const error = new Error(message);
      error.status = res.status;
      error.data = errorData;
      throw error;
    }
    
    try { 
      const data = await res.json();
      console.log(`[apiFetch] Success response for ${url}:`, data);
      return data;
    } catch (_) { 
      return null; 
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı ve backend'in çalıştığını kontrol edin.");
    }
    throw error;
  }
}
