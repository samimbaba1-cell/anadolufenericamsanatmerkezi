/** Türkçe karakterleri ASCII'ye çevirip URL slug üretir */
const TR_MAP = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u"
};

function transliterateTr(text) {
  return String(text || "")
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("");
}

function slugifyTr(input) {
  return transliterateTr(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(String(value || ""));
  } catch {
    return String(value || "");
  }
}

module.exports = {
  slugifyTr,
  transliterateTr,
  safeDecodeURIComponent
};
