"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch, getApiBaseUrl } from "../../../lib/api";
import { resolveMediaUrl } from "../../../lib/images";

const FILTER_OPTIONS = [
  { value: "all", label: "Tüm Dosyalar" },
  { value: "image", label: "Resimler" },
  { value: "video", label: "Videolar" },
  { value: "document", label: "Dökümanlar" },
  { value: "other", label: "Diğer" }
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Tarihe göre" },
  { value: "originalName", label: "Ada göre" },
  { value: "size", label: "Dosya boyutu" }
];

const PAGE_LIMIT = 24;
const TYPE_LABELS = {
  image: "Resimler",
  video: "Videolar",
  document: "Dökümanlar",
  other: "Diğer"
};
const TYPE_ORDER = ["image", "video", "document", "other"];

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return "0 KB";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatDate(dateLike) {
  if (!dateLike) return "-";
  try {
    return new Date(dateLike).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

export default function MediaPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [viewMode, setViewMode] = useState("grid");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filters, setFilters] = useState({ type: "all", search: "", sort: "createdAt", sortDir: "desc" });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const addSelectedFiles = useCallback((incomingFiles) => {
    if (!incomingFiles?.length) return;
    setSelectedFiles((prev) => {
      const existing = new Set(prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
      const next = [];
      incomingFiles.forEach((file) => {
        const signature = `${file.name}-${file.size}-${file.lastModified}`;
        if (!existing.has(signature)) {
          existing.add(signature);
          next.push(file);
        }
      });
      return [...prev, ...next];
    });
  }, []);

  const clearSelectedFiles = useCallback(() => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const typeStats = useMemo(() => TYPE_ORDER.map((key) => ({
    key,
    label: TYPE_LABELS[key],
    count: stats?.countsByType?.[key]?.count || 0,
    totalSize: stats?.countsByType?.[key]?.totalSize || 0
  })), [stats]);

  const selectedTotalSize = useMemo(() => {
    return selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
  }, [selectedFiles]);

  const loadMedia = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(PAGE_LIMIT));
      params.set("sort", filters.sort);
      params.set("sortDir", filters.sortDir);
      if (filters.type && filters.type !== "all") params.set("type", filters.type);
      if (filters.search?.trim()) params.set("search", filters.search.trim());

      const data = await apiFetch(`/api/media?${params.toString()}`, { token });
      setMedia(data.items || []);
      setPagination(data.pagination || { page: 1, pages: 1, total: 0 });
    } catch (error) {
      console.error("Media load error", error);
      showToast(error.message || "Medya yüklenirken hata oluştu", "error");
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [token, filters.type, filters.search, filters.sort, filters.sortDir, pagination.page, showToast]);

  const loadStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    try {
      const data = await apiFetch(`/api/media/stats`, { token });
      setStats(data);
    } catch (error) {
      console.error("Media stats error", error);
      showToast(error.message || "Medya istatistikleri yüklenirken hata oluştu", "error");
    } finally {
      setStatsLoading(false);
    }
  }, [token, showToast]);

  useEffect(() => {
    if (!token || authLoading) return;
    loadMedia();
    loadStats();
  }, [token, authLoading, loadMedia, loadStats]);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || []);
    addSelectedFiles(files);
    if (event.target) {
      event.target.value = "";
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer?.files || []);
    addSelectedFiles(files);
  };

  const handleRemoveSelectedFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRefresh = useCallback(() => {
    loadMedia();
    loadStats();
  }, [loadMedia, loadStats]);

  const handleUpload = async () => {
    if (!selectedFiles.length || !token) return;
    setUploading(true);
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));

      const response = await fetch(`${getApiBaseUrl()}/api/media/upload`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Dosya yükleme başarısız oldu");
      }

      showToast(payload?.message || `${selectedFiles.length} dosya yüklendi`, "success");
      clearSelectedFiles();
      await loadMedia();
      await loadStats();
    } catch (error) {
      console.error("Upload error", error);
      showToast(error.message || "Dosya yükleme hatası", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!token) return;
    if (!window.confirm("Bu dosyayı silmek istediğinize emin misiniz?")) return;
    try {
      await apiFetch(`/api/media/${id}`, { method: "DELETE", token });
      showToast("Dosya silindi", "success");
      await loadMedia();
      await loadStats();
    } catch (error) {
      console.error("Delete error", error);
      showToast(error.message || "Dosya silinemedi", "error");
    }
  };

  const handleCopy = (url) => {
    const fullUrl = resolveMediaUrl(url, url);
    navigator.clipboard.writeText(fullUrl)
      .then(() => showToast("URL kopyalandı", "success"))
      .catch(() => showToast("URL kopyalanamadı", "error"));
  };

  const handleFilterChange = (key, value) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handlePageChange = (page) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const filteredMedia = useMemo(() => media, [media]);

  if (authLoading || loading && !media.length) {
    return <main className="max-w-7xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!user || user.role !== "admin") {
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
    <main className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-semibold">Medya Galerisi</h1>
          <p className="text-gray-600">Dosyalarınızı yükleyin, yönetin ve paylaşın</p>
        </div>
        <Button variant="secondary" onClick={handleRefresh} disabled={loading || statsLoading}>
          {loading || statsLoading ? "Yenileniyor..." : "Yenile"}
        </Button>
      </header>

      <Card className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Depolama Özeti</h2>
            <p className="text-sm text-gray-600">Toplam kullanım, tür kırılımları ve son yüklemeler</p>
          </div>
          <div className="text-xs font-medium text-gray-500">
            Son yükleme: {stats?.lastUploadAt ? formatDate(stats.lastUploadAt) : "—"}
          </div>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={`stats-skeleton-${idx}`} className="rounded-lg border border-gray-100 p-4">
                <div className="h-4 w-24 animate-pulse rounded-full bg-gray-200" />
                <div className="mt-3 h-6 w-20 animate-pulse rounded-full bg-gray-200" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Toplam Dosya</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{stats?.totalCount ?? 0}</p>
            </div>
            <div className="rounded-lg border border-gray-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Toplam Boyut</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{formatBytes(stats?.totalSize || 0)}</p>
            </div>
            {typeStats.map((item) => (
              <div key={item.key} className="rounded-lg border border-gray-100 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-gray-900">{item.count}</p>
                <p className="text-xs text-gray-500">{formatBytes(item.totalSize)}</p>
              </div>
            ))}
          </div>
        )}

        {!statsLoading && stats?.recentUploads?.length > 0 && (
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-700">Son yüklenenler</h3>
            <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100 bg-white">
              {stats.recentUploads.map((item) => (
                <li key={item._id || `${item.url}-${item.createdAt}`} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">{item.originalName}</p>
                    <p className="text-xs text-gray-500">
                      {(TYPE_LABELS[item.type] || item.type?.toUpperCase())} • {formatBytes(item.size)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    <span>{formatDate(item.createdAt)}</span>
                    <Button variant="secondary" size="sm" onClick={() => handleCopy(item.url)}>
                      Kopyala
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Dosya Yükle</h2>
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            isDragActive ? "border-primary bg-blue-50/70" : "border-gray-300 bg-white"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <label htmlFor="file-upload" className="flex cursor-pointer flex-col items-center gap-3">
            <svg className="h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="text-lg font-medium text-gray-700">Dosyaları seçin veya sürükleyip bırakın</span>
            <span className="text-sm text-gray-500">PNG, JPG, GIF, MP4, PDF ve diğer formatlar desteklenir</span>
            {isDragActive && <span className="text-xs font-medium text-primary">Bırakın, yüklemeye hazırlanalım</span>}
          </label>
        </div>
        {selectedFiles.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Seçilen dosyalar</h3>
              <button type="button" className="text-xs font-medium text-red-600 hover:underline" onClick={clearSelectedFiles}>
                Tümünü temizle
              </button>
            </div>
            <ul className="space-y-1 text-sm text-gray-600">
              {selectedFiles.map((file, index) => (
                <li
                  key={`${file.name}-${file.lastModified}-${index}`}
                  className="flex items-center justify-between rounded bg-gray-50 px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatBytes(file.size)}</p>
                  </div>
                  <button
                    type="button"
                    className="text-xs font-medium text-red-500 hover:underline"
                    onClick={() => handleRemoveSelectedFile(index)}
                  >
                    Kaldır
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Toplam {selectedFiles.length} dosya</span>
              <span>{formatBytes(selectedTotalSize)}</span>
            </div>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "Yükleniyor..." : `${selectedFiles.length} dosyayı yükle`}
            </Button>
          </div>
        )}
      </Card>

      <Card className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="input-modern w-44"
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filters.sort}
            onChange={(e) => handleFilterChange("sort", e.target.value)}
            className="input-modern w-40"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filters.sortDir}
            onChange={(e) => handleFilterChange("sortDir", e.target.value)}
            className="input-modern w-32"
          >
            <option value="desc">Azalan</option>
            <option value="asc">Artan</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="search"
            placeholder="Dosya ara..."
            value={filters.search}
            onChange={(e) => handleFilterChange("search", e.target.value)}
            className="input-modern w-64"
          />
          <div className="flex gap-2">
            <Button variant={viewMode === "grid" ? "primary" : "secondary"} onClick={() => setViewMode("grid")}>Grid</Button>
            <Button variant={viewMode === "list" ? "primary" : "secondary"} onClick={() => setViewMode("list")}>Liste</Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {Array.from({ length: PAGE_LIMIT }).slice(0, 8).map((_, idx) => (
            <Card key={idx} className="h-48 animate-pulse bg-gray-100" />
          ))}
        </div>
      ) : filteredMedia.length === 0 ? (
        <Card className="p-12 text-center text-gray-600">Dosya bulunamadı.</Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredMedia.map((item) => (
            <Card key={item._id} className="group relative overflow-hidden border border-gray-100 p-4">
              <div className="relative mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-gray-100">
                {item.type === "image" ? (
                  <Image
                    src={resolveMediaUrl(item.url, null)}
                    alt={item.originalName || item.filename}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <span className="text-sm text-gray-500">{item.type.toUpperCase()}</span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <div className="font-medium text-gray-900" title={item.originalName}>{item.originalName}</div>
                <div className="text-xs text-gray-500">{(item.size / 1024).toFixed(1)} KB</div>
                <div className="text-xs text-gray-400">{new Date(item.createdAt).toLocaleString("tr-TR")}</div>
              </div>
              <div className="mt-3 flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <Button variant="secondary" size="sm" onClick={() => handleCopy(item.url)} className="flex-1">
                  Kopyala
                </Button>
                <Button variant="danger" size="sm" onClick={() => handleDelete(item._id)} className="flex-1">
                  Sil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-4 py-3">Dosya</th>
                  <th className="px-4 py-3">Boyut</th>
                  <th className="px-4 py-3">Tür</th>
                  <th className="px-4 py-3">Yüklenme</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filteredMedia.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded bg-gray-100">
                          {item.type === "image" ? (
                            <Image
                              src={resolveMediaUrl(item.url, null)}
                              alt={item.originalName || item.filename}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                              {item.type.toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900" title={item.originalName}>{item.originalName}</div>
                          <div className="text-xs text-gray-500">{item.filename}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{(item.size / 1024).toFixed(1)} KB</td>
                    <td className="px-4 py-3 text-gray-600">{item.type}</td>
                    <td className="px-4 py-3 text-gray-500">{new Date(item.createdAt).toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" size="sm" onClick={() => handleCopy(item.url)}>
                          Kopyala
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(item._id)}>
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {pagination.pages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
          <span>Toplam {pagination.total} dosya</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.pages }).map((_, idx) => {
              const pageNumber = idx + 1;
              const active = pageNumber === pagination.page;
              return (
                <button
                  key={pageNumber}
                  onClick={() => handlePageChange(pageNumber)}
                  className={`rounded-md px-3 py-1 ${active ? "bg-gray-900 text-white" : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
