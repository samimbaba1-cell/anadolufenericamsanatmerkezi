"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Card from "../../../../components/ui/Card";
import Button from "../../../../components/ui/Button";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import { apiFetch, getMediaUploadUrl } from "../../../../lib/api";
import { resolveMediaUrl } from "../../../../lib/images";
import MediaPicker from "../../../../components/admin/MediaPicker";
import ProductVariantsEditor, { EMPTY_VARIANT, buildVariantLabel } from "./ProductVariantsEditor";

const BASE_FORM = {
  name: "",
  shortDescription: "",
  description: "",
  price: "",
  originalPrice: "",
  stock: "",
  minStock: "",
  category: "",
  brand: "",
  sku: "",
  barcode: "",
  tags: "",
  weight: "",
  length: "",
  width: "",
  height: "",
  expiryDate: "",
  metaTitle: "",
  metaDescription: "",
  isActive: true,
  isFeatured: false
};

const DEFAULT_ATTRIBUTE = { name: "", value: "" };

/**
 * Para alanları: virgüllü TR (1.234,56) ve tek noktalı ondalık (56,65 / 56.65).
 * Binlik noktayı "5" + "600" birleştirip 5600 yapan heuristik kaldırıldı — kullanıcı
 * 56 yazınca veya 5.600 yazınca yanlış sonuç veriyordu. Binlik: 1.234,00 veya 1234 yazın.
 * Çok nokta: 1.234.567,89 → tüm noktalar (virgülden önce) kaldırılır.
 */
function parseLocaleNumber(value, { required = false } = {}) {
  if (value === "" || value === null || value === undefined) {
    return required ? 0 : undefined;
  }
  let s = String(value).trim().replace(/\s/g, "");
  if (s === "") {
    return required ? 0 : undefined;
  }

  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const dotCount = (s.match(/\./g) || []).length;
    if (dotCount > 1) {
      s = s.replace(/\./g, "");
    }
  }

  const n = Number(s);
  if (Number.isNaN(n)) {
    return required ? 0 : undefined;
  }
  return n;
}

/** Stok: sadece rakamlar; 1.234 / 1,234 gibi binlik ayracı 1234 sayılır. */
function parseIntegerInput(value) {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }
  const digits = String(value).replace(/\D/g, "");
  if (digits === "") return undefined;
  return parseInt(digits, 10);
}

const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY"
});

export default function ProductForm({ mode = "create", productId, initialProduct }) {
  const router = useRouter();
  const { token } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState(BASE_FORM);
  const [attributes, setAttributes] = useState([DEFAULT_ATTRIBUTE]);
  const [variants, setVariants] = useState([{ ...EMPTY_VARIANT }]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    setForm((prev) => {
      const safeName = typeof prev.name === "string" ? prev.name : "";
      return { ...prev, metaTitle: prev.metaTitle || safeName.slice(0, 60) };
    });
  }, [form.name]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    async function loadCategories() {
      setLoadingCategories(true);
      try {
        const data = await apiFetch("/api/categories?all=true", { token });
        if (mounted) {
          setCategories(Array.isArray(data) ? data : data.items || []);
        }
      } catch (error) {
        console.error("Categories load error", error);
        showToast("Kategori listesi yüklenemedi", "error");
      } finally {
        if (mounted) setLoadingCategories(false);
      }
    }
    loadCategories();
    return () => {
      mounted = false;
    };
  }, [token, showToast]);

  useEffect(() => {
    if (!token) return;
    let mounted = true;
    const loadBrands = async () => {
      setLoadingBrands(true);
      try {
        const data = await apiFetch("/api/brands?all=true&includeCounts=true", { token });
        if (mounted) {
          setBrands(Array.isArray(data) ? data : data.items || []);
        }
      } catch (error) {
        console.error("Brands load error", error);
        showToast("Marka listesi yüklenemedi", "error");
      } finally {
        if (mounted) setLoadingBrands(false);
      }
    };
    loadBrands();
    return () => {
      mounted = false;
    };
  }, [token, showToast]);

  useEffect(() => {
    if (!initialProduct) {
      setForm(BASE_FORM);
      setAttributes([DEFAULT_ATTRIBUTE]);
      setVariants([{ ...EMPTY_VARIANT }]);
      setExistingImages([]);
      return;
    }
    setForm({
      ...BASE_FORM,
      ...pickProductFields(initialProduct)
    });
    setAttributes(
      Array.isArray(initialProduct.attributes) && initialProduct.attributes.length
        ? initialProduct.attributes.map((attr) => ({
            name: attr.name || "",
            value: attr.value || ""
          }))
        : [DEFAULT_ATTRIBUTE]
    );
    setExistingImages(initialProduct.images || []);
    setVariants(
      Array.isArray(initialProduct.variants) && initialProduct.variants.length
        ? initialProduct.variants.map((v) => ({
            name: v.name || "",
            color: v.color || "",
            size: v.size || "",
            ringSize: v.ringSize || "",
            sku: v.sku || "",
            barcode: v.barcode || "",
            price: v.price != null ? String(v.price) : "",
            originalPrice: v.originalPrice != null ? String(v.originalPrice) : "",
            stock: v.stock != null ? String(v.stock) : "",
            images: Array.isArray(v.images) ? v.images : []
          }))
        : [{ ...EMPTY_VARIANT }]
    );
  }, [initialProduct]);

  useEffect(() => {
    if (!initialProduct || !initialProduct.brand || form.brand || !brands.length) return;
    const match = brands.find(
      (brand) => brand.name && brand.name.toLowerCase() === String(initialProduct.brand).toLowerCase()
    );
    if (match) {
      const bid = match.id ?? match._id;
      setForm((prev) => ({ ...prev, brand: bid != null ? String(bid) : "" }));
    }
  }, [initialProduct, brands, form.brand]);

  useEffect(() => {
    return () => {
      newImagePreviews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newImagePreviews]);

const normalizeValue = (value) => {
    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string") {
      return value;
    }
    return value == null ? "" : String(value);
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: normalizeValue(value)
    }));
  };

  const handleAttributeChange = (index, key, value) => {
    setAttributes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addAttribute = () => {
    setAttributes((prev) => [...prev, DEFAULT_ATTRIBUTE]);
  };

  const removeAttribute = (index) => {
    setAttributes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNewImages = (files) => {
    const fileList = Array.from(files || []);
    if (!fileList.length) return;
    const previews = fileList.map((file) => URL.createObjectURL(file));
    setNewImages((prev) => [...prev, ...fileList]);
    setNewImagePreviews((prev) => [...prev, ...previews]);
  };

  const removeNewImage = (index) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => {
      const next = [...prev];
      const [removed] = next.splice(index, 1);
      if (removed) URL.revokeObjectURL(removed);
      return next;
    });
  };

  const removeExistingImage = (url) => {
    setExistingImages((prev) => prev.filter((img) => img !== url));
  };

  const uploadImages = async () => {
    if (!newImages.length) return [];
    const fd = new FormData();
    newImages.forEach((file) => fd.append("files", file));

    const res = await fetch(getMediaUploadUrl(), {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd
    });

    if (!res.ok) {
      throw new Error("Görseller yüklenemedi");
    }

    const data = await res.json();
    const urls = data?.files?.map((file) => file.url).filter(Boolean);
    if (!urls || !urls.length) {
      throw new Error("Görsel yükleme yanıtı geçersiz");
    }
    return urls;
  };

  const validate = () => {
    const errors = {};
    if (!form.name.trim()) errors.name = "Ürün adı zorunludur.";
    const priceN = parseLocaleNumber(form.price);
    if (priceN == null || priceN < 0) errors.price = "Geçerli bir fiyat girin (örn. 56,65 veya 56.65).";
    if (form.stock === "" || form.stock == null) errors.stock = "Stok gerekli.";
    else {
      const stockN = parseIntegerInput(form.stock);
      if (stockN == null || stockN < 0) errors.stock = "Geçerli stok girin.";
    }
    if (!form.category) errors.category = "Kategori seçmelisiniz.";
    if (form.barcode && !/^\d{13}$/.test(form.barcode)) errors.barcode = "Barkod 13 hane olmalıdır.";
    const origN = form.originalPrice ? parseLocaleNumber(form.originalPrice) : null;
    if (origN != null && origN < priceN) {
      errors.originalPrice = "İndirimli fiyat, ana fiyattan küçük olamaz.";
    }
    if (form.minStock) {
      const minSn = parseIntegerInput(form.minStock);
      if (minSn != null && minSn < 0) errors.minStock = "Minimum stok negatif olamaz.";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const buildPayload = async () => {
    const uploadedUrls = await uploadImages();
    const trimmedAttributes = attributes
      .map((attr) => ({
        name: attr.name.trim(),
        value: attr.value.trim()
      }))
      .filter((attr) => attr.name && attr.value);

    const tags = form.tags
      ? form.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [];

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      shortDescription: form.shortDescription.trim(),
      price: parseLocaleNumber(form.price, { required: true }),
      originalPrice: parseLocaleNumber(form.originalPrice),
      stock: parseIntegerInput(form.stock) ?? 0,
      minStock: form.minStock ? (parseIntegerInput(form.minStock) ?? 0) : undefined,
      category: form.category || undefined,
      brand: form.brand?.trim() || undefined,
      sku: form.sku?.trim() || undefined,
      barcode: form.barcode?.trim() || undefined,
      expiryDate: form.expiryDate || undefined,
      metaTitle: form.metaTitle?.trim() || undefined,
      metaDescription: form.metaDescription?.trim() || undefined,
      isActive: Boolean(form.isActive),
      isFeatured: Boolean(form.isFeatured),
      tags,
      attributes: trimmedAttributes,
      variants: variants
        .filter((v) => v.color?.trim() || v.size?.trim() || v.ringSize?.trim() || v.name?.trim() || v.sku?.trim())
        .map((v) => ({
          name: buildVariantLabel(v),
          color: v.color?.trim() || undefined,
          size: v.size?.trim() || undefined,
          ringSize: v.ringSize?.trim() || undefined,
          sku: v.sku?.trim() || undefined,
          barcode: v.barcode?.trim() || undefined,
          price: v.price ? parseLocaleNumber(v.price) : undefined,
          originalPrice: v.originalPrice ? parseLocaleNumber(v.originalPrice) : undefined,
          stock: v.stock !== "" && v.stock != null ? parseIntegerInput(v.stock) ?? 0 : 0,
          images: Array.isArray(v.images) ? v.images.filter(Boolean) : []
        })),
      images: [...existingImages, ...uploadedUrls]
    };

    if (form.weight) payload.weight = parseLocaleNumber(form.weight);
    if (form.length || form.width || form.height) {
      payload.dimensions = {
        length: form.length ? parseLocaleNumber(form.length) : undefined,
        width: form.width ? parseLocaleNumber(form.width) : undefined,
        height: form.height ? parseLocaleNumber(form.height) : undefined
      };
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = await buildPayload();
      const endpoint = mode === "edit" ? `/api/products/${productId}` : "/api/products";
      const method = mode === "edit" ? "PUT" : "POST";
      const result = await apiFetch(endpoint, { method, token, body: payload });
      showToast(
        mode === "edit" ? "Ürün güncellendi" : "Ürün başarıyla oluşturuldu",
        "success"
      );
      if (mode === "create") {
        setForm(BASE_FORM);
        setAttributes([DEFAULT_ATTRIBUTE]);
        setExistingImages([]);
        setNewImages([]);
        setNewImagePreviews([]);
        const newId = result.product?.id ?? result.product?._id;
        if (newId != null) router.push(`/admin/products/edit/${newId}`);
      } else {
        setNewImages([]);
        setNewImagePreviews([]);
        if (payload.images) {
          setExistingImages(payload.images);
        }
      }
    } catch (error) {
      console.error("Product save error", error);
      showToast(error.message || "Ürün kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  };

  const googlePreview = useMemo(() => {
    const safeName = typeof form.name === "string" ? form.name : "";
    const safeTitle = typeof form.metaTitle === "string" ? form.metaTitle : "";
    const safeMetaDescription = typeof form.metaDescription === "string" ? form.metaDescription : "";
    const safeShortDescription = typeof form.shortDescription === "string" ? form.shortDescription : "";
    const safeDescription = typeof form.description === "string" ? form.description : "";
    const safeSku = typeof form.sku === "string" ? form.sku : "";

    return {
      title: safeTitle.trim() || safeName.trim(),
      description:
        safeMetaDescription.trim() ||
        safeShortDescription.trim() ||
        safeDescription.slice(0, 160),
      url: safeSku ? `https://siteadresiniz.com/product/${safeSku}` : "https://siteadresiniz.com/product/urun"
    };
  }, [form.metaTitle, form.name, form.metaDescription, form.shortDescription, form.description, form.sku]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{mode === "edit" ? "Ürün Bilgileri" : "Yeni Ürün"}</h2>
            <p className="text-sm text-gray-500">Temel ürün içeriklerini düzenleyin</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => handleChange("isActive", e.target.checked)}
              />
              Aktif
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => handleChange("isFeatured", e.target.checked)}
              />
              Öne çıkarılmış
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField
          label="Ürün Adı *"
          value={normalizeValue(form.name)}
          onChange={(value) => handleChange("name", value)}
          error={validationErrors.name}
        />
        <SelectField
          label="Marka"
          value={form.brand || ""}
          onChange={(value) => handleChange("brand", value)}
          options={brands}
          loading={loadingBrands}
          placeholder="Marka seçiniz"
        />
          <InputField
            label="Fiyat *"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="56,65 veya 56.65"
            value={form.price}
            onChange={(value) => handleChange("price", value)}
            error={validationErrors.price}
          />
          <InputField
            label="İndirimli Fiyat"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="İsteğe bağlı"
            value={form.originalPrice}
            onChange={(value) => handleChange("originalPrice", value)}
            error={validationErrors.originalPrice}
          />
          <InputField
            label="Stok *"
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(value) => handleChange("stock", value)}
            error={validationErrors.stock}
          />
          <InputField
            label="Minimum Stok"
            type="number"
            min="0"
            step="1"
            value={form.minStock}
            onChange={(value) => handleChange("minStock", value)}
            error={validationErrors.minStock}
          />
        <InputField
            label="SKU"
          value={normalizeValue(form.sku)}
            onChange={(value) => handleChange("sku", value)}
          />
        <InputField
            label="Barkod"
          value={normalizeValue(form.barcode)}
            maxLength={13}
            onChange={(value) => handleChange("barcode", value)}
            error={validationErrors.barcode}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SelectField
            label="Kategori *"
            value={form.category}
            onChange={(value) => handleChange("category", value)}
            options={categories}
            loading={loadingCategories}
            error={validationErrors.category}
          />
          <InputField
            label="Son Kullanma Tarihi"
            type="date"
            value={form.expiryDate}
            onChange={(value) => handleChange("expiryDate", value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <InputField
            label="Etiketler (virgülle ayırın)"
          value={normalizeValue(form.tags)}
            onChange={(value) => handleChange("tags", value)}
            placeholder="cam, vazo, dekoratif"
          />
        <InputField
            label="Ağırlık (kg)"
            type="number"
            min="0"
            step="0.01"
          value={normalizeValue(form.weight)}
            onChange={(value) => handleChange("weight", value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <InputField
            label="Uzunluk (cm)"
            type="number"
            min="0"
            step="0.1"
          value={normalizeValue(form.length)}
            onChange={(value) => handleChange("length", value)}
          />
        <InputField
            label="Genişlik (cm)"
            type="number"
            min="0"
            step="0.1"
          value={normalizeValue(form.width)}
            onChange={(value) => handleChange("width", value)}
          />
        <InputField
            label="Yükseklik (cm)"
            type="number"
            min="0"
            step="0.1"
          value={normalizeValue(form.height)}
            onChange={(value) => handleChange("height", value)}
          />
        </div>

        <TextareaField
          label="Kısa Açıklama"
          value={form.shortDescription}
          onChange={(value) => handleChange("shortDescription", value)}
          maxLength={500}
        />
        <TextareaField
          label="Detaylı Açıklama"
          value={form.description}
          onChange={(value) => handleChange("description", value)}
          rows={6}
        />
      </Card>

            <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold">Renk / boy varyantları</h2>
          <p className="text-sm text-gray-500 mb-4">
            Farklı renk, boy veya yüzük ölçüsü için ayrı stok, fiyat ve görsel tanımlayın.
          </p>
          <ProductVariantsEditor variants={variants} onChange={setVariants} />
        </div>
      </Card>

<Card className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Özellikler</h2>
            <p className="text-sm text-gray-500">Ürüne ait teknik veya özel alanlar</p>
          </div>
          <Button type="button" variant="secondary" onClick={addAttribute}>
            + Özellik Ekle
          </Button>
        </div>
        <div className="space-y-3">
          {attributes.map((attr, index) => (
            <div key={index} className="grid grid-cols-1 gap-3 md:grid-cols-5">
              <input
                type="text"
                value={attr.name}
                onChange={(e) => handleAttributeChange(index, "name", e.target.value)}
                className="input-modern md:col-span-2"
                placeholder="Özellik adı"
              />
              <input
                type="text"
                value={attr.value}
                onChange={(e) => handleAttributeChange(index, "value", e.target.value)}
                className="input-modern md:col-span-2"
                placeholder="Değer"
              />
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={() => removeAttribute(index)} disabled={attributes.length === 1}>
                  Kaldır
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">Görseller</h2>
        <MediaPicker
          label="Medya kütüphanesinden ekle"
          value=""
          onChange={(url) => {
            if (url) setExistingImages((prev) => (prev.includes(url) ? prev : [...prev, url]));
          }}
          hint="Seçilen görsel aşağıdaki listeye eklenir"
        />

        {existingImages.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {existingImages.map((url) => (
              <div key={url} className="relative group h-32">
                <Image
                  src={resolveMediaUrl(url, "/images/placeholder-product.jpg")}
                  alt="Ürün görseli"
                  fill
                  className="rounded object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(url)}
                  className="absolute right-2 top-2 hidden rounded-full bg-black/70 px-2 py-1 text-xs text-white group-hover:block"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}

        {newImagePreviews.length > 0 && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {newImagePreviews.map((preview, index) => (
              <div key={preview} className="relative group h-32">
                <Image
                  src={preview}
                  alt="Yeni görsel"
                  fill
                  className="rounded object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute right-2 top-2 hidden rounded-full bg-black/70 px-2 py-1 text-xs text-white group-hover:block"
                >
                  Sil
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-gray-500">
          Medya kütüphanesinden eklediğiniz her görsel listeye eklenir. İlk görsel kartlarda öne çıkar.
        </p>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="text-lg font-semibold">SEO</h2>
        <InputField
          label="Meta Başlığı"
          value={form.metaTitle}
          onChange={(value) => handleChange("metaTitle", value)}
          maxLength={60}
        />
        <TextareaField
          label="Meta Açıklaması"
          value={form.metaDescription}
          onChange={(value) => handleChange("metaDescription", value)}
          maxLength={160}
          rows={3}
        />
        <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm">
          <p className="text-green-700">{googlePreview.url}</p>
          <p className="text-xl text-blue-700 line-clamp-2">{googlePreview.title}</p>
          <p className="text-gray-700 line-clamp-3">{googlePreview.description}</p>
        </div>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <Button type="button" variant="secondary" onClick={() => router.push("/admin/products")}>
          İptal
        </Button>
        <Button type="submit" disabled={saving} loading={saving}>
          {mode === "edit" ? "Değişiklikleri Kaydet" : "Ürün Oluştur"}
        </Button>
      </div>
    </form>
  );
}

function InputField({ label, error, value, onChange, ...rest }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <input
        value={typeof value === "string" ? value : value == null ? "" : String(value)}
        onChange={(e) => onChange?.(e.target.value)}
        {...rest}
        className={`input-modern ${error ? "border-red-500" : ""}`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function TextareaField({ label, error, value, onChange, ...rest }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <textarea
        value={typeof value === "string" ? value : value == null ? "" : String(value)}
        onChange={(e) => onChange?.(e.target.value)}
        {...rest}
        className={`input-modern ${error ? "border-red-500" : ""}`}
      />
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function SelectField({ label, options = [], loading, error, onChange, value, placeholder = "Seçiniz", ...rest }) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        {...rest}
        className={`input-modern ${error ? "border-red-500" : ""}`}
      >
        <option value="">{loading ? "Yükleniyor..." : placeholder}</option>
        {options
          .filter(Boolean)
          .map((opt, index) => {
            const v = opt.id ?? opt._id;
            return (
          <option
            key={v != null ? `opt-${v}` : `opt-idx-${index}`}
            value={v != null ? String(v) : ""}
          >
            {opt.name}
          </option>
            );
          })}
      </select>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  );
}

function pickCategoryId(product) {
  const c = product?.category;
  if (c == null || c === "") return "";
  if (typeof c === "object") {
    const id = c.id ?? c._id;
    return id != null ? String(id) : "";
  }
  return String(c);
}

function pickProductFields(product) {
  return {
    name: product.name || "",
    shortDescription: product.shortDescription || "",
    description: product.description || "",
    price: formatNumber(product.price),
    originalPrice: formatNumber(product.originalPrice),
    stock: formatNumber(product.stock),
    minStock: formatNumber(product.minStock),
    category: pickCategoryId(product),
    brand: String(product.brandRef?.id ?? product.brandRef?._id ?? ""),
    sku: product.sku || "",
    barcode: product.barcode || "",
    tags: Array.isArray(product.tags) ? product.tags.join(", ") : "",
    weight: formatNumber(product.weight),
    length: formatNumber(product.dimensions?.length),
    width: formatNumber(product.dimensions?.width),
    height: formatNumber(product.dimensions?.height),
    expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : "",
    metaTitle: product.metaTitle || "",
    metaDescription: product.metaDescription || "",
    isActive: product.isActive !== false,
    isFeatured: Boolean(product.isFeatured)
  };
}

function formatNumber(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}


