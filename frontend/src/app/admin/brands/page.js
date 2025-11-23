"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { useAuth } from "../../../context/AuthContext";
import { apiFetch } from "../../../lib/api";
import { resolveMediaUrl } from "../../../lib/images";

const EMPTY_FORM = {
  name: "",
  description: "",
  website: "",
  logo: "",
  banner: "",
  country: "",
  sortOrder: "0",
  isActive: true
};

export default function AdminBrandsPage() {
  const { token, user, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter((brand) => brand.name?.toLowerCase().includes(term));
  }, [items, search]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/brands?all=true&includeCounts=true", { token });
      setItems(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error("Brand load error:", err);
      setError(err.message || "Markalar yüklenirken bir hata oluştu");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && user?.role === "admin") {
      load();
    }
  }, [token, user?.role, load]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError("Marka adı zorunludur");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        website: form.website?.trim() || undefined,
        logo: form.logo?.trim() || undefined,
        banner: form.banner?.trim() || undefined,
        country: form.country?.trim() || undefined,
        sortOrder: Number(form.sortOrder || 0),
        isActive: Boolean(form.isActive)
      };
      if (editingId) {
        await apiFetch(`/api/brands/${editingId}`, { method: "PUT", token, body: payload });
        setMessage("Marka güncellendi");
      } else {
        await apiFetch("/api/brands", { method: "POST", token, body: payload });
        setMessage("Marka oluşturuldu");
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error("Brand save error:", err);
      setError(err.message || "Marka kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (brand) => {
    setEditingId(brand._id);
    setForm({
      name: brand.name || "",
      description: brand.description || "",
      website: brand.website || "",
      logo: brand.logo || "",
      banner: brand.banner || "",
      country: brand.country || "",
      sortOrder: String(brand.sortOrder ?? 0),
      isActive: Boolean(brand.isActive)
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu markayı silmek istediğinizden emin misiniz?")) return;
    try {
      await apiFetch(`/api/brands/${id}`, { method: "DELETE", token });
      setMessage("Marka silindi");
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      await load();
    } catch (err) {
      console.error("Brand delete error:", err);
      setError(err.message || "Marka silinemedi");
    }
  };

  const handleToggle = async (brand) => {
    try {
      await apiFetch(`/api/brands/${brand._id}/status`, {
        method: "PATCH",
        token,
        body: { isActive: !brand.isActive }
      });
      await load();
    } catch (err) {
      console.error("Brand toggle error:", err);
      setError(err.message || "Durum güncellenemedi");
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  if (authLoading) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
    return <main className="max-w-6xl mx-auto p-6">Yetkisiz</main>;
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marka Yönetimi</h1>
          <p className="text-sm text-gray-500">Markaları oluştur, düzenle ve ürünlerle eşleştir</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/products/new" className="hidden sm:inline-flex">
            <Button variant="secondary">Yeni ürün ekle</Button>
          </Link>
          <Button variant="outline" onClick={resetForm} disabled={!editingId}>
            Yeni Marka
          </Button>
        </div>
      </div>

      {message && (
        <div className="rounded border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-6 space-y-4 lg:col-span-1">
          <h2 className="text-lg font-semibold">{editingId ? "Markayı Güncelle" : "Yeni Marka"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Marka Adı *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input-modern"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="input-modern"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Web sitesi</label>
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
                  className="input-modern"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ülke</label>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
                  className="input-modern"
                  placeholder="Türkiye"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                <input
                  type="url"
                  value={form.logo}
                  onChange={(e) => setForm((prev) => ({ ...prev, logo: e.target.value }))}
                  className="input-modern"
                  placeholder="/uploads/media/logo.png"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Banner URL</label>
                <input
                  type="url"
                  value={form.banner}
                  onChange={(e) => setForm((prev) => ({ ...prev, banner: e.target.value }))}
                  className="input-modern"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sıralama</label>
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                  className="input-modern"
                  min="0"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Aktif
              </label>
            </div>
            <div className="flex justify-end gap-3">
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Vazgeç
                </Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : editingId ? "Markayı Güncelle" : "Marka Oluştur"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          <Card className="p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <input
              type="search"
              className="input-modern sm:max-w-xs"
              placeholder="Marka ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="text-sm text-gray-500">Toplam {filtered.length} marka</span>
          </Card>

          <Card className="p-0">
            {loading ? (
              <div className="p-6">Yükleniyor...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-gray-600">Marka bulunamadı.</div>
            ) : (
              <div className="divide-y">
                {filtered.map((brand) => (
                  <div key={brand._id} className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded bg-gray-100 relative">
                        <Image
                          src={resolveMediaUrl(brand.logo, "/images/placeholder-product.jpg")}
                          alt={brand.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{brand.name}</div>
                        <div className="text-sm text-gray-600 flex flex-wrap gap-2">
                          {brand.website && <a href={brand.website} target="_blank" rel="noreferrer" className="text-blue-600 underline">Web sitesi</a>}
                          {brand.country && <span>{brand.country}</span>}
                          <span>Ürün sayısı: {brand.productCount ?? 0}</span>
                        </div>
                        {brand.description && (
                          <div className="text-xs text-gray-500 line-clamp-2">{brand.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <button
                        onClick={() => handleToggle(brand)}
                        className={`px-3 py-1 rounded-full border ${brand.isActive ? "border-green-500 text-green-600" : "border-gray-400 text-gray-500"}`}
                      >
                        {brand.isActive ? "Aktif" : "Pasif"}
                      </button>
                      <button onClick={() => handleEdit(brand)} className="text-gray-700 hover:underline">
                        Düzenle
                      </button>
                      <button onClick={() => handleDelete(brand._id)} className="text-red-600 hover:underline">
                        Sil
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}

