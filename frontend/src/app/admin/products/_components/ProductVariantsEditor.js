"use client";

import Image from "next/image";
import Button from "../../../../components/ui/Button";
import MediaPicker from "../../../../components/admin/MediaPicker";
import { resolveMediaUrl } from "../../../../lib/images";

export const EMPTY_VARIANT = {
  name: "",
  color: "",
  size: "",
  ringSize: "",
  sku: "",
  barcode: "",
  price: "",
  originalPrice: "",
  stock: "",
  images: [],
};

export function buildVariantLabel(v) {
  if (v.name?.trim()) return v.name.trim();
  return [v.color, v.size, v.ringSize].filter(Boolean).join(" — ") || "Varyant";
}

export default function ProductVariantsEditor({ variants, onChange }) {
  const updateVariant = (index, key, value) => {
    onChange(
      variants.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const addVariant = () => onChange([...variants, { ...EMPTY_VARIANT }]);

  const removeVariant = (index) => {
    if (variants.length <= 1) {
      onChange([{ ...EMPTY_VARIANT }]);
      return;
    }
    onChange(variants.filter((_, i) => i !== index));
  };

  const setVariantImage = (index, url) => {
    const row = variants[index];
    const images = url ? [url] : [];
    updateVariant(index, "images", images);
  };

  return (
    <div className="space-y-4">
      {variants.map((variant, index) => (
        <div key={index} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-medium text-gray-900">
              Varyant {index + 1}
              {buildVariantLabel(variant) !== "Varyant" ? (
                <span className="ml-2 text-sm font-normal text-gray-500">({buildVariantLabel(variant)})</span>
              ) : null}
            </h3>
            <Button type="button" variant="ghost" onClick={() => removeVariant(index)}>
              Kaldır
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Field label="Renk" value={variant.color} onChange={(v) => updateVariant(index, "color", v)} placeholder="Kırmızı, Mavi…" />
            <Field label="Boy / Ölçü" value={variant.size} onChange={(v) => updateVariant(index, "size", v)} placeholder="Küçük, Büyük, 20cm…" />
            <Field label="Yüzük ölçüsü" value={variant.ringSize} onChange={(v) => updateVariant(index, "ringSize", v)} placeholder="14, 16…" />
          </div>

          <Field
            label="Görünen ad (isteğe bağlı)"
            value={variant.name}
            onChange={(v) => updateVariant(index, "name", v)}
            placeholder="Boş bırakılırsa renk/boy birleştirilir"
          />

          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Field label="SKU" value={variant.sku} onChange={(v) => updateVariant(index, "sku", v)} />
            <Field label="Barkod (13 hane)" value={variant.barcode} onChange={(v) => updateVariant(index, "barcode", v)} />
            <Field label="Fiyat (₺)" value={variant.price} onChange={(v) => updateVariant(index, "price", v)} inputMode="decimal" />
            <Field label="Eski fiyat" value={variant.originalPrice} onChange={(v) => updateVariant(index, "originalPrice", v)} inputMode="decimal" />
            <Field label="Stok" value={variant.stock} onChange={(v) => updateVariant(index, "stock", v)} inputMode="numeric" />
          </div>

          <MediaPicker
            label="Varyant görseli"
            value={variant.images?.[0] || ""}
            onChange={(url) => setVariantImage(index, url)}
            hint="Bu renk/boy için ayrı ürün fotoğrafı"
          />

          {variant.images?.[0] ? (
            <div className="relative h-24 w-24 overflow-hidden rounded-lg border">
              <Image
                src={resolveMediaUrl(variant.images[0], "/images/placeholder-product.jpg")}
                alt={buildVariantLabel(variant)}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            </div>
          ) : null}
        </div>
      ))}

      <Button type="button" variant="secondary" onClick={addVariant}>
        + Varyant ekle (renk / boy)
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, inputMode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-gray-700">{label}</span>
      <input
        type="text"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="input-modern w-full"
      />
    </label>
  );
}
