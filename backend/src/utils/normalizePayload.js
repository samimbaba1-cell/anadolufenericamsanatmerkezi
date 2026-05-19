/** Ürün create/update gövdesini Sequelize alanlarına eşler */
function normalizeProductPayload(body = {}) {
  const payload = { ...body };

  if (payload.category !== undefined) {
    const raw = payload.category;
    payload.categoryId =
      raw === "" || raw === null || raw === undefined ? null : parseInt(raw, 10);
    delete payload.category;
  }

  delete payload.length;
  delete payload.width;
  delete payload.height;
  delete payload.brandRef;

  if (Array.isArray(payload.variants)) {
    payload.variants = payload.variants.map((v) => ({
      name: (v.name || "").trim(),
      color: (v.color || "").trim() || undefined,
      size: (v.size || "").trim() || undefined,
      ringSize: (v.ringSize || "").trim() || undefined,
      sku: (v.sku || "").trim() || undefined,
      barcode: (v.barcode || "").trim() || undefined,
      price: v.price != null && v.price !== "" ? Number(v.price) : undefined,
      originalPrice:
        v.originalPrice != null && v.originalPrice !== "" ? Number(v.originalPrice) : undefined,
      stock: v.stock != null && v.stock !== "" ? parseInt(v.stock, 10) : 0,
      images: Array.isArray(v.images) ? v.images.filter(Boolean) : []
    }));
  }

  return payload;
}

/** Kategori create/update — parent → parentId */
function normalizeCategoryPayload(body = {}) {
  const payload = { ...body };

  if (payload.parent !== undefined) {
    const raw = payload.parent;
    payload.parentId =
      raw === "" || raw === null || raw === undefined ? null : parseInt(raw, 10);
    delete payload.parent;
  }

  return payload;
}

module.exports = {
  normalizeProductPayload,
  normalizeCategoryPayload
};
