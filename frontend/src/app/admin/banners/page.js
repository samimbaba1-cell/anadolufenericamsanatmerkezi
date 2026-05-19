"use client";

export const dynamic = 'force-dynamic';
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { useState, useEffect, useCallback, useMemo } from "react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Image from "next/image";
import { apiFetch, getMediaUploadUrl } from "../../../lib/api";
import { resolveMediaUrl } from "../../../lib/images";
import MediaPicker from "../../../components/admin/MediaPicker";

const INITIAL_FORM = {
  title: "",
  subtitle: "",
  description: "",
  image: "",
  mobileImage: "",
  link: "",
  buttonText: "Detay",
  type: "hero",
  position: "top",
  isActive: true,
  order: 1,
  startDate: "",
  endDate: "",
  targetAudience: "all",
  backgroundColor: "#3B82F6",
  textColor: "#FFFFFF"
};

const bannerTypes = [
  { value: "hero", label: "Ana Banner (Hero)" },
  { value: "category", label: "Kategori Banner" },
  { value: "product", label: "Ürün Banner" },
  { value: "promotion", label: "Promosyon Banner" },
  { value: "newsletter", label: "Newsletter Banner" }
];

const audienceOptions = [
  { value: "all", label: "Tüm ziyaretçiler" },
  { value: "guest", label: "Üye olmayan ziyaretçiler" },
  { value: "customers", label: "Üye müşteriler" },
  { value: "vip", label: "VIP müşteriler" }
];

function toDateInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function normalizeBanner(raw) {
  if (!raw) return null;
  return {
    id: raw.id || raw._id,
    title: raw.title || "",
    subtitle: raw.subtitle || "",
    description: raw.description || "",
    image: raw.image || "",
    mobileImage: raw.mobileImage || "",
    link: raw.link || "",
    buttonText: raw.buttonText || "Detay",
    type: raw.type || "hero",
    position: raw.position || "top",
    isActive: Boolean(raw.isActive),
    order: Number(raw.order) || 1,
    startDate: toDateInput(raw.startDate),
    endDate: toDateInput(raw.endDate),
    targetAudience: raw.targetAudience || "all",
    backgroundColor: raw.backgroundColor || "#3B82F6",
    textColor: raw.textColor || "#FFFFFF",
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt
  };
}

function preparePayload(form) {
  return {
    ...form,
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    description: form.description.trim(),
    image: (form.image || "").trim(),
    mobileImage: (form.mobileImage || "").trim(),
    link: form.link.trim(),
    buttonText: form.buttonText.trim(),
    order: Number(form.order) || 1,
    startDate: form.startDate || null,
    endDate: form.endDate || null
  };
}

const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export default function BannersPage() {
  const { user, token } = useAuth();
  const { showToast } = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [actionBannerId, setActionBannerId] = useState(null);
  const [uploadingField, setUploadingField] = useState(null);
  const [reordering, setReordering] = useState(false);

  const isAdmin = user?.role === "admin" && Boolean(token);

  const resetForm = useCallback(() => {
    setEditingBanner(null);
    setFormData(INITIAL_FORM);
    setFormErrors({});
  }, []);

  const loadBanners = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      console.log("Loading banners from /api/banners/admin with token:", token ? "present" : "missing");
      const data = await apiFetch("/api/banners/admin", { token });
      console.log("Banners API response:", data);
      const items = data?.items || (Array.isArray(data) ? data : []);
      const normalized = items.map(normalizeBanner);
      setBanners(normalized);
    } catch (error) {
      console.error("Banners load error:", error);
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
      showToast(error.message || "Bannerlar yüklenirken hata oluştu!", "error");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, token, showToast]);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleOpenForm = () => {
    resetForm();
    setShowForm(true);
  };

  const validateForm = useCallback(() => {
    const errors = {};
    const titleOk = Boolean(formData.title?.trim());
    const imgOk = Boolean(formData.image?.trim());
    const mobOk = Boolean(formData.mobileImage?.trim());
    const uploading =
      uploadingField === "image" || uploadingField === "mobileImage";
    if (!titleOk && !imgOk && !mobOk && !uploading) {
      errors.title = "Başlık veya en az bir görsel (URL / yükleme) gerekli";
      errors.image = "Masaüstü veya mobil görsel URL’si girin ya da dosya yükleyin";
    }
    const hexPattern = /^#([0-9A-Fa-f]{6})$/;
    if (formData.backgroundColor && !hexPattern.test(formData.backgroundColor)) {
      errors.backgroundColor = "Geçerli HEX renk girin";
    }
    if (formData.textColor && !hexPattern.test(formData.textColor)) {
      errors.textColor = "Geçerli HEX renk girin";
    }
    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      errors.endDate = "Bitiş tarihi başlangıçtan önce olamaz";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, uploadingField]);

  const uploadMedia = useCallback(
    async (field, file) => {
      if (!file || !isAdmin) return;
      setUploadingField(field);
      try {
        const form = new FormData();
        form.append("files", file);
        const response = await fetch(getMediaUploadUrl(), {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: form
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Dosya yüklenemedi");
        }
        const data = await response.json();
        console.log("Media upload response:", data);
        const uploadedFile = data?.files?.[0];
        if (!uploadedFile) {
          console.error("Upload response structure:", data);
          throw new Error("Geçersiz yükleme yanıtı");
        }
        const url = uploadedFile.url || uploadedFile.filename;
        if (!url) {
          console.error("Uploaded file structure:", uploadedFile);
          throw new Error("URL alınamadı");
        }
        console.log("Setting URL for field:", field, "URL:", url);
        // State'i güncelle ve validation error'ları temizle
        setFormData((prev) => {
          const updated = { ...prev, [field]: url };
          console.log("Updated formData:", updated);
          return updated;
        });
        // İlgili field'ın error'unu temizle
        setFormErrors((prev) => {
          const updated = { ...prev };
          delete updated[field];
          return updated;
        });
        showToast("Görsel yüklendi", "success");
      } catch (error) {
        console.error("Media upload error:", error);
        showToast(error.message || "Görsel yüklenirken hata oluştu", "error");
      } finally {
        setUploadingField(null);
      }
    },
    [isAdmin, token, showToast]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;
    
    // Upload devam ediyorsa bekle
    if (uploadingField) {
      showToast("Lütfen görsel yüklenmesini bekleyin", "warning");
      return;
    }
    
    if (!validateForm()) {
      showToast("Lütfen işaretlenen alanları düzeltin", "error");
      return;
    }

    setLoading(true);

    try {
      const payload = preparePayload(formData);
      const response = await apiFetch(`/api/banners${editingBanner ? `/${editingBanner.id}` : ""}`, {
        method: editingBanner ? "PUT" : "POST",
        token,
        body: payload
      });

      const savedBanner = normalizeBanner(response);

      if (editingBanner) {
        setBanners((prev) => prev.map((banner) => (banner.id === savedBanner.id ? savedBanner : banner)));
        showToast("Banner güncellendi!", "success");
      } else {
        setBanners((prev) => [...prev, savedBanner].sort((a, b) => a.order - b.order));
        showToast("Banner oluşturuldu!", "success");
      }

      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error("Banner save error:", error);
      showToast(error.message || "Banner kaydedilirken hata oluştu!", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({ ...banner });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!isAdmin || !window.confirm("Bu bannerı silmek istediğinizden emin misiniz?")) {
      return;
    }

    setLoading(true);
    try {
      await apiFetch(`/api/banners/${id}`, { method: "DELETE", token });
      setBanners((prev) => prev.filter((banner) => banner.id !== id));
      showToast("Banner silindi!", "success");
    } catch (error) {
      console.error("Banner delete error:", error);
      showToast(error.message || "Banner silinirken hata oluştu!", "error");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (banner) => {
    if (!isAdmin) return;
    setActionBannerId(banner.id);
    try {
      const updated = await apiFetch(`/api/banners/${banner.id}`, {
        method: "PUT",
        token,
        body: { isActive: !banner.isActive }
      });
      const normalized = normalizeBanner(updated);
      setBanners((prev) => prev.map((item) => (item.id === normalized.id ? normalized : item)));
      showToast(`Banner ${normalized.isActive ? "aktifleştirildi" : "pasifleştirildi"}`, "success");
    } catch (error) {
      console.error("Banner toggle error:", error);
      showToast(error.message || "Banner durumu güncellenemedi", "error");
    } finally {
      setActionBannerId(null);
    }
  };

  const handleReorder = async (bannerId, direction) => {
    if (!isAdmin) return;
    const currentIndex = banners.findIndex((item) => item.id === bannerId);
    if (currentIndex === -1) return;
    const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= banners.length) {
      return;
    }
    setReordering(true);
    try {
      const reordered = [...banners];
      const [moved] = reordered.splice(currentIndex, 1);
      reordered.splice(nextIndex, 0, moved);
      const payload = reordered.map((item, index) => ({
        id: item.id,
        order: index + 1
      }));
      await apiFetch("/api/banners/reorder", {
        method: "POST",
        token,
        body: { bannerOrders: payload }
      });
      setBanners(reordered.map((item, index) => ({ ...item, order: index + 1 })));
      showToast("Banner sıralaması güncellendi", "success");
    } catch (error) {
      console.error("Reorder banner error:", error);
      showToast(error.message || "Sıralama güncellenemedi", "error");
    } finally {
      setReordering(false);
    }
  };

  const sortedBanners = useMemo(
    () => [...banners].sort((a, b) => a.order - b.order),
    [banners]
  );

  const bannerStats = useMemo(() => {
    const total = banners.length;
    const active = banners.filter((banner) => banner.isActive).length;
    const scheduled = banners.filter((banner) => banner.startDate && new Date(banner.startDate) > new Date()).length;
    const heroCount = banners.filter((banner) => banner.type === "hero").length;
    return { total, active, scheduled, heroCount };
  }, [banners]);

  if (!isAdmin) {
    return (
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-700">Bu sayfa yalnızca adminler içindir.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Banner Yönetimi</h1>
            <p className="text-gray-600">Ana sayfa bannerlarını yönetin</p>
          </div>
          <Button onClick={handleOpenForm}>
            <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Yeni Banner
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600 md:grid-cols-4">
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Toplam</p>
            <p className="text-2xl font-semibold text-gray-900">{bannerStats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Aktif</p>
            <p className="text-2xl font-semibold text-green-600">{bannerStats.active}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Planlanmış</p>
            <p className="text-2xl font-semibold text-blue-600">{bannerStats.scheduled}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">Hero Banner</p>
            <p className="text-2xl font-semibold text-purple-600">{bannerStats.heroCount}</p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {loading && banners.length === 0 ? (
          <div className="col-span-2 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <Card key={index} className="p-6">
                <div className="animate-pulse">
                  <div className="mb-4 h-48 rounded-lg bg-gray-200" />
                  <div className="mb-2 h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </Card>
            ))}
          </div>
        ) : sortedBanners.length === 0 ? (
          <div className="col-span-2 py-12 text-center">
            <svg className="mx-auto mb-4 h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Henüz banner yok</h3>
            <p className="mb-4 text-gray-600">İlk bannerınızı oluşturun</p>
            <Button onClick={handleOpenForm}>Banner Oluştur</Button>
          </div>
        ) : (
          sortedBanners.map((banner) => (
            <Card key={banner.id} className="group overflow-hidden p-0 transition-shadow hover:shadow-lg">
              <div className="relative">
                <div className="h-48 bg-gray-100">
                  {banner.image ? (
                    <Image
                      src={resolveMediaUrl(banner.image)}
                      alt={banner.title || "Banner görseli"}
                      width={400}
                      height={200}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      Görsel yok
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-40 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="text-center text-white">
                    <h3 className="mb-2 text-xl font-bold">{banner.title?.trim() || "Başlıksız"}</h3>
                    <p className="text-sm">{banner.subtitle}</p>
                  </div>
                </div>
                <div className="absolute right-2 top-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${
                      banner.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {banner.isActive ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">{banner.title?.trim() || "Başlıksız"}</h3>
                  <span className="text-xs text-gray-500">#{banner.order}</span>
                </div>
                <p className="mb-3 text-sm text-gray-600">{banner.subtitle}</p>

                <div className="mb-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{bannerTypes.find((type) => type.value === banner.type)?.label}</span>
                  <span className="capitalize">{banner.position}</span>
                </div>
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
                  <div>
                    <span className="font-medium text-gray-700">Başlangıç:</span> {formatDate(banner.startDate)}
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Bitiş:</span> {formatDate(banner.endDate)}
                  </div>
                  <div className="col-span-2">
                    <span className="font-medium text-gray-700">Hedef:</span>{" "}
                    {audienceOptions.find((opt) => opt.value === banner.targetAudience)?.label || banner.targetAudience}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleReorder(banner.id, "up")}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
                      title="Yukarı taşı"
                      disabled={reordering || sortedBanners[0]?.id === banner.id}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7 7 7M5 19h14" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleReorder(banner.id, "down")}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50"
                      title="Aşağı taşı"
                      disabled={reordering || sortedBanners[sortedBanners.length - 1]?.id === banner.id}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7M19 5H5" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleEdit(banner)}
                      className="rounded-lg p-2 text-blue-600 transition-colors hover:bg-blue-50"
                      title="Düzenle"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleActive(banner)}
                      className={`rounded-lg p-2 transition-colors ${
                        banner.isActive ? "text-yellow-600 hover:bg-yellow-50" : "text-green-600 hover:bg-green-50"
                      }`}
                      title={banner.isActive ? "Pasifleştir" : "Aktifleştir"}
                      disabled={actionBannerId === banner.id}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(banner.id)}
                      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50"
                      title="Sil"
                      disabled={loading}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: banner.backgroundColor }} />
                    <span className="text-xs text-gray-500">{banner.type}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <h2 className="text-xl font-semibold">{editingBanner ? "Bannerı Düzenle" : "Yeni Banner"}</h2>
                <p className="text-sm text-gray-500">Banner bilgilerini doldurun</p>
              </div>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <span className="sr-only">Kapat</span>
                ×
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Başlık
                  <span className="ml-1 font-normal text-gray-500">(isteğe bağlı; görsel varsa boş bırakılabilir)</span>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className={`input-modern ${formErrors.title ? "border-red-500" : ""}`}
                    placeholder="Örn. Yaz koleksiyonu"
                  />
                  {formErrors.title && <p className="text-xs text-red-600">{formErrors.title}</p>}
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Alt Başlık
                  <input
                    type="text"
                    value={formData.subtitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, subtitle: e.target.value }))}
                    className="input-modern"
                  />
                </label>
                <label className="md:col-span-2 space-y-1 text-sm font-medium text-gray-700">
                  Açıklama
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="input-modern min-h-[80px]"
                  />
                </label>
                
                <div className="md:col-span-2 space-y-4">
                  <MediaPicker
                    label="Masaüstü banner görseli"
                    value={formData.image || ""}
                    onChange={(url) => {
                      setFormData((prev) => ({ ...prev, image: url }));
                      if (url && formErrors.image) {
                        setFormErrors((prev) => {
                          const updated = { ...prev };
                          delete updated.image;
                          return updated;
                        });
                      }
                    }}
                  />
                  {formErrors.image && <p className="text-xs text-red-600">{formErrors.image}</p>}
                  <MediaPicker
                    label="Mobil banner görseli"
                    value={formData.mobileImage || ""}
                    onChange={(url) => setFormData((prev) => ({ ...prev, mobileImage: url }))}
                  />
                </div>
<label className="space-y-1 text-sm font-medium text-gray-700">
                  Buton Metni
                  <input
                    type="text"
                    value={formData.buttonText}
                    onChange={(e) => setFormData((prev) => ({ ...prev, buttonText: e.target.value }))}
                    className="input-modern"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Tür
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                    className="input-modern"
                  >
                    {bannerTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Pozisyon
                  <select
                    value={formData.position}
                    onChange={(e) => setFormData((prev) => ({ ...prev, position: e.target.value }))}
                    className="input-modern"
                  >
                    <option value="top">Üst</option>
                    <option value="middle">Orta</option>
                    <option value="bottom">Alt</option>
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Sıralama
                  <input
                    type="number"
                    min={1}
                    value={formData.order}
                    onChange={(e) => setFormData((prev) => ({ ...prev, order: Number(e.target.value) || 1 }))}
                    className="input-modern"
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Başlangıç Tarihi
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="input-modern"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Bitiş Tarihi
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    className={`input-modern ${formErrors.endDate ? "border-red-500" : ""}`}
                  />
                  {formErrors.endDate && <p className="text-xs text-red-600">{formErrors.endDate}</p>}
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Hedef Kitle
                  <select
                    value={formData.targetAudience}
                    onChange={(e) => setFormData((prev) => ({ ...prev, targetAudience: e.target.value }))}
                    className="input-modern"
                  >
                    {audienceOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Arkaplan Rengi
                  <input
                    type="color"
                    value={formData.backgroundColor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, backgroundColor: e.target.value }))}
                    className="h-10 w-full cursor-pointer"
                  />
                  {formErrors.backgroundColor && <p className="text-xs text-red-600">{formErrors.backgroundColor}</p>}
                </label>
                <label className="space-y-1 text-sm font-medium text-gray-700">
                  Yazı Rengi
                  <input
                    type="color"
                    value={formData.textColor}
                    onChange={(e) => setFormData((prev) => ({ ...prev, textColor: e.target.value }))}
                    className="h-10 w-full cursor-pointer"
                  />
                  {formErrors.textColor && <p className="text-xs text-red-600">{formErrors.textColor}</p>}
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <label className="inline-flex items-center space-x-2 text-sm font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Banner aktif</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  disabled={loading}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Kaydediliyor..." : editingBanner ? "Güncelle" : "Oluştur"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
