"use client";

export const dynamic = 'force-dynamic';
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import { apiFetch } from "../../../lib/api";
import Button from "../../../components/ui/Button";
import Card from "../../../components/ui/Card";
import { resolveMediaUrl } from "../../../lib/images";

const EMPTY_FORM = {
  name: "",
  description: "",
  parent: "",
  sortOrder: "0",
  isActive: true,
  metaTitle: "",
  metaDescription: "",
  image: ""
};

export default function AdminCategoriesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter((item) => item.name?.toLowerCase().includes(term));
  }, [items, search]);

  const load = useCallback(async () => {
    if (!token || user?.role !== "admin") return;
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/api/categories?all=true", { token });
      const list = Array.isArray(data) ? data : data.items || [];
      setItems(list);
    } catch (err) {
      console.error("Kategori yükleme hatası:", err);
      setError(err.message || "Kategoriler yüklenirken bir hata oluştu");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [token, user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Kategori adı zorunludur");
      return;
    }
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        parent: form.parent || null,
        sortOrder: Number(form.sortOrder || 0),
        isActive: Boolean(form.isActive),
        metaTitle: form.metaTitle?.trim() || undefined,
        metaDescription: form.metaDescription?.trim() || undefined,
        image: form.image?.trim() || undefined
      };

      if (editingId) {
        await apiFetch(`/api/categories/${editingId}`, {
          method: "PUT",
          body: payload,
          token
        });
        setMessage("Kategori güncellendi");
      } else {
        await apiFetch("/api/categories", {
          method: "POST",
          body: payload,
          token
        });
        setMessage("Kategori oluşturuldu");
      }

      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      console.error("Kategori kaydetme hatası:", err);
      setError(err.message || "Kategori kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setForm({
      name: category.name || "",
      description: category.description || "",
      parent: category.parent?._id || category.parent || "",
      sortOrder: String(category.sortOrder ?? 0),
      isActive: Boolean(category.isActive),
      metaTitle: category.metaTitle || "",
      metaDescription: category.metaDescription || "",
      image: category.image || ""
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;
    try {
      await apiFetch(`/api/categories/${id}`, { method: "DELETE", token });
      setMessage("Kategori silindi");
      if (editingId === id) {
        setEditingId(null);
        setForm(EMPTY_FORM);
      }
      await load();
    } catch (err) {
      console.error("Kategori silme hatası:", err);
      setError(err.message || "Kategori silinemedi");
    }
  };

  const handleToggleActive = async (category) => {
    try {
      await apiFetch(`/api/categories/${category._id}/status`, {
        method: "PATCH",
        body: { isActive: !category.isActive },
        token
      });
      await load();
    } catch (err) {
      console.error("Durum değiştirme hatası:", err);
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kategori Yönetimi</h1>
          <p className="text-sm text-gray-500">Kategorileri ekleyin, düzenleyin ve yönetin</p>
        </div>
        <Button variant="outline" onClick={resetForm} disabled={!editingId}>Yeni Kategori</Button>
      </div>

      {message && <div className="rounded bg-green-50 border border-green-200 text-sm text-green-700 px-4 py-2">{message}</div>}
      {error && <div className="rounded bg-red-50 border border-red-200 text-sm text-red-700 px-4 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-6 lg:col-span-1">
          <h2 className="text-lg font-semibold mb-4">{editingId ? "Kategori Güncelle" : "Yeni Kategori"}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ad *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="input-modern"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="input-modern"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Üst Kategori</label>
              <select
                value={form.parent}
                onChange={(e) => setForm((prev) => ({ ...prev, parent: e.target.value }))}
                className="input-modern"
              >
                <option value="">(Yok)</option>
                {items.filter((item) => item._id !== editingId).map((item) => (
                  <option key={item._id} value={item._id}>{item.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sıralama</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                className="input-modern"
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Aktif</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Başlık</label>
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) => setForm((prev) => ({ ...prev, metaTitle: e.target.value }))}
                className="input-modern"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meta Açıklama</label>
              <textarea
                value={form.metaDescription}
                onChange={(e) => setForm((prev) => ({ ...prev, metaDescription: e.target.value }))}
                className="input-modern"
                rows={2}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Görsel URL</label>
              <input
                type="url"
                value={form.image}
                onChange={(e) => setForm((prev) => ({ ...prev, image: e.target.value }))}
                className="input-modern"
                placeholder="/uploads/media/..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              {editingId && (
                <Button type="button" variant="secondary" onClick={resetForm}>Vazgeç</Button>
              )}
              <Button type="submit" disabled={saving}>
                {saving ? "Kaydediliyor..." : editingId ? "Kategoriyi Güncelle" : "Kategori Oluştur"}
              </Button>
            </div>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <input
                type="search"
                placeholder="Kategori ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-modern sm:max-w-xs"
              />
              <span className="text-sm text-gray-500">Toplam {filteredItems.length} kategori</span>
            </div>
          </Card>

          <Card className="p-0">
            {loading ? (
              <div className="p-6">Yükleniyor...</div>
            ) : filteredItems.length === 0 ? (
              <div className="p-6 text-center text-gray-600">Kategori bulunamadı.</div>
            ) : (
              <div className="divide-y">
                {filteredItems.map((cat) => (
                  <div key={cat._id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden relative">
                        <Image
                          src={resolveMediaUrl(cat.image, "/images/placeholder-product.jpg")}
                          alt={cat.name}
                          fill
                          className="object-cover"
                          sizes="48px"
                          unoptimized
                        />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{cat.name}</div>
                        <div className="text-sm text-gray-600">
                          {cat.parent?.name ? `Üst kategori: ${cat.parent.name}` : 'Üst kategori: Yok'} • Sıra: {cat.sortOrder ?? 0}
                        </div>
                        <div className="text-xs text-gray-500">Ürün sayısı: {cat.productCount ?? 0}</div>
                        {cat.metaTitle && <div className="text-xs text-gray-400">Meta: {cat.metaTitle}</div>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`px-3 py-1 rounded-full border ${cat.isActive ? 'border-green-500 text-green-600' : 'border-gray-400 text-gray-500'}`}
                      >
                        {cat.isActive ? 'Aktif' : 'Pasif'}
                      </button>
                      <span className="text-xs text-gray-500">Sıra: {cat.sortOrder ?? 0}</span>
                      <button onClick={() => handleEdit(cat)} className="text-gray-700 hover:underline">Düzenle</button>
                      <button onClick={() => handleDelete(cat._id)} className="text-red-600 hover:underline">Sil</button>
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
