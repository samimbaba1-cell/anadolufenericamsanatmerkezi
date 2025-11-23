"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function getApiBaseUrl() {
  return API_URL;
}

export async function apiFetch(path, { method = "GET", body, token, headers = {} } = {}) {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
      try { 
        const data = await res.json(); 
        if (data?.message) message = data.message; 
      } catch (_) {}
      
      // Specific error handling
      if (res.status === 401) {
        message = "Oturum süresi doldu. Lütfen tekrar giriş yapın.";
      } else if (res.status === 403) {
        message = "Bu işlem için yetkiniz bulunmuyor.";
      } else if (res.status === 404) {
        message = "Aranan kaynak bulunamadı.";
      } else if (res.status === 500) {
        message = "Sunucu hatası. Lütfen daha sonra tekrar deneyin.";
      }
      
      throw new Error(message);
    }
    
    try { 
      return await res.json(); 
    } catch (_) { 
      return null; 
    }
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error("Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.");
    }
    throw error;
  }
}
