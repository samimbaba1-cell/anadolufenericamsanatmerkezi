/** API/ayarlardan gelen değeri güvenli metin yap (slice vb. için). */
export function asDisplayString(value, fallback = "") {
  if (typeof value === "string") return value;
  if (value == null) return fallback;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

/** Yanıtın dizi olup olmadığını kontrol et (rate-limit JSON objesi için). */
export function asArray(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}
