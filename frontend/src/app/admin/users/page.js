"use client";

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";

const ROLE_OPTIONS = [
  { value: "all", label: "Tüm Roller" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderatör" },
  { value: "user", label: "Kullanıcı" }
];

const STATUS_OPTIONS = [
  { value: "all", label: "Tüm Durumlar" },
  { value: "active", label: "Aktif" },
  { value: "inactive", label: "Pasif" },
  { value: "banned", label: "Yasaklı" }
];

const BULK_ACTIONS = [
  { value: "activate", label: "Aktifleştir" },
  { value: "deactivate", label: "Pasifleştir" },
  { value: "ban", label: "Yasakla" },
  { value: "delete", label: "Sil" }
];

export default function UsersPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: "", role: "all", status: "all" });
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 10 });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [bulkAction, setBulkAction] = useState("activate");

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("limit", String(pagination.limit));
      if (filters.search.trim()) params.set("search", filters.search.trim());
      if (filters.role !== "all") params.set("role", filters.role);
      if (filters.status !== "all") params.set("status", filters.status);
      const data = await apiFetch(`/api/admin/users?${params.toString()}`, { token });
      setUsers(data.users || []);
      setPagination((prev) => ({
        ...prev,
        page: data.pagination?.page || prev.page,
        pages: data.pagination?.pages || prev.pages,
        total: data.pagination?.total || prev.total
      }));
      setSelectedUserIds([]);
    } catch (error) {
      console.error("Users load error", error);
      showToast(error.message || "Kullanıcılar yüklenirken hata oluştu!", "error");
    } finally {
      setLoading(false);
    }
  }, [token, filters.search, filters.role, filters.status, pagination.page, pagination.limit, showToast]);

  useEffect(() => {
    if (!authLoading) {
      loadUsers();
    }
  }, [authLoading, loadUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: "PUT",
        token,
        body: { role: newRole }
      });
      setUsers((prev) => prev.map((item) => (item._id === userId ? { ...item, role: newRole } : item)));
      showToast("Kullanıcı rolü güncellendi!", "success");
    } catch (error) {
      console.error("Role update error", error);
      showToast(error.message || "Rol güncelleme hatası!", "error");
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    try {
      await apiFetch(`/api/admin/users/${userId}/status`, {
        method: "PUT",
        token,
        body: { status: newStatus }
      });
      setUsers((prev) => prev.map((item) => (item._id === userId ? { ...item, status: newStatus } : item)));
      showToast("Kullanıcı durumu güncellendi!", "success");
    } catch (error) {
      console.error("Status update error", error);
      showToast(error.message || "Durum güncelleme hatası!", "error");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) return;
    try {
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE", token });
      setUsers((prev) => prev.filter((item) => item._id !== userId));
      showToast("Kullanıcı silindi!", "success");
    } catch (error) {
      console.error("Delete user error", error);
      showToast(error.message || "Kullanıcı silme hatası!", "error");
    }
  };

  const handleBulkAction = async () => {
    if (!selectedUserIds.length) {
      showToast("Lütfen kullanıcı seçin!", "warning");
      return;
    }
    try {
      await apiFetch(`/api/admin/users/bulk`, {
        method: "POST",
        token,
        body: { userIds: selectedUserIds, action: bulkAction }
      });
      showToast(`${selectedUserIds.length} kullanıcı için işlem tamamlandı!`, "success");
      loadUsers();
    } catch (error) {
      console.error("Bulk action error", error);
      showToast(error.message || "Toplu işlem hatası!", "error");
    }
  };

  const allSelected = useMemo(() => selectedUserIds.length && selectedUserIds.length === users.length, [selectedUserIds.length, users.length]);

  const toggleSelectAll = (checked) => {
    if (checked) {
      setSelectedUserIds(users.map((item) => item._id));
    } else {
      setSelectedUserIds([]);
    }
  };

  const toggleSelectUser = (userId, checked) => {
    setSelectedUserIds((prev) => {
      if (checked) {
        return prev.includes(userId) ? prev : [...prev, userId];
      }
      return prev.filter((id) => id !== userId);
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800";
      case "moderator":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-green-100 text-green-800";
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-yellow-100 text-yellow-800";
      case "banned":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (authLoading || (loading && !users.length)) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
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
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold">Kullanıcı Yönetimi</h1>
        <p className="text-gray-600">Kullanıcı bilgilerini görüntüleyin, rollerini ve durumlarını yönetin.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-1 text-sm text-gray-700">
            <span>Arama</span>
            <input
              type="search"
              value={filters.search}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, search: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input-modern"
              placeholder="İsim veya e-posta"
            />
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span>Rol</span>
            <select
              value={filters.role}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, role: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input-modern"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm text-gray-700">
            <span>Durum</span>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value }));
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="input-modern"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => {
                setFilters({ search: "", role: "all", status: "all" });
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full"
            >
              Filtreleri Temizle
            </Button>
          </div>
        </div>
      </Card>

      {selectedUserIds.length > 0 && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <span>{selectedUserIds.length} kullanıcı seçildi</span>
          <div className="flex gap-2">
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="input-modern"
            >
              {BULK_ACTIONS.map((action) => (
                <option key={action.value} value={action.value}>{action.label}</option>
              ))}
            </select>
            <Button onClick={handleBulkAction} size="sm">Uygula</Button>
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Kullanıcı</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Rol</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Kayıt Tarihi</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Son Giriş</th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Yükleniyor...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">Kullanıcı bulunamadı.</td>
                </tr>
              ) : (
                users.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(item._id)}
                        onChange={(e) => toggleSelectUser(item._id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                          {item.name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{item.name || "-"}</div>
                          <div className="text-sm text-gray-500">{item.email || "-"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.role}
                        onChange={(e) => handleRoleChange(item._id, e.target.value)}
                        className={`input-modern text-xs font-medium ${getRoleBadgeClass(item.role)}`}
                      >
                        <option value="user">Kullanıcı</option>
                        <option value="moderator">Moderatör</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={item.status}
                        onChange={(e) => handleStatusChange(item._id, e.target.value)}
                        className={`input-modern text-xs font-medium ${getStatusBadgeClass(item.status)}`}
                      >
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                        <option value="banned">Yasaklı</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {item.lastLogin ? new Date(item.lastLogin).toLocaleString('tr-TR') : "Hiç giriş yapmamış"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <div className="flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => showToast("Detay sayfası henüz hazır değil", "info")}>Detay</Button>
                        <Button variant="danger" size="sm" onClick={() => handleDeleteUser(item._id)}>Sil</Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {pagination.pages > 1 && (
        <div className="flex justify-end gap-2 text-sm text-gray-600">
          {Array.from({ length: pagination.pages }).map((_, idx) => {
            const pageNumber = idx + 1;
            const active = pageNumber === pagination.page;
            return (
              <button
                key={pageNumber}
                onClick={() => setPagination((prev) => ({ ...prev, page: pageNumber }))}
                className={`rounded px-3 py-1 ${active ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"}`}
              >
                {pageNumber}
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
}
