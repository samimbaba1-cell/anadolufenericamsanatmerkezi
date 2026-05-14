"use client";

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import { useToast } from "../../../../context/ToastContext";
import Card from "../../../../components/ui/Card";
import Button from "../../../../components/ui/Button";
import { apiFetch } from "../../../../lib/api";

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/admin/users/${params.id}`, { token });
      setUser(data);
    } catch (error) {
      console.error("User load error", error);
      showToast(error.message || "Kullanıcı yüklenirken hata oluştu!", "error");
      router.push("/admin/users");
    } finally {
      setLoading(false);
    }
  }, [params.id, token, showToast, router]);

  useEffect(() => {
    if (authLoading || !token) return;
    loadUser();
  }, [authLoading, token, loadUser]);

  const handleRoleChange = async (newRole) => {
    try {
      await apiFetch(`/api/admin/users/${params.id}/role`, {
        method: "PUT",
        token,
        body: { role: newRole }
      });
      setUser({ ...user, role: newRole });
      showToast("Kullanıcı rolü güncellendi!", "success");
    } catch (error) {
      console.error("Role update error", error);
      showToast(error.message || "Rol güncelleme hatası!", "error");
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await apiFetch(`/api/admin/users/${params.id}/status`, {
        method: "PUT",
        token,
        body: { status: newStatus }
      });
      setUser({ ...user, status: newStatus, isActive: newStatus === 'active' });
      showToast("Kullanıcı durumu güncellendi!", "success");
    } catch (error) {
      console.error("Status update error", error);
      showToast(error.message || "Durum güncelleme hatası!", "error");
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinizden emin misiniz?")) return;
    try {
      await apiFetch(`/api/admin/users/${params.id}`, { method: "DELETE", token });
      showToast("Kullanıcı silindi!", "success");
      router.push("/admin/users");
    } catch (error) {
      console.error("Delete user error", error);
      showToast(error.message || "Kullanıcı silme hatası!", "error");
    }
  };

  if (authLoading || loading) {
    return <main className="max-w-6xl mx-auto p-6">Yükleniyor...</main>;
  }

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Erişim Reddedildi</h1>
          <p className="text-gray-700">Bu sayfa yalnızca adminler içindir.</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="max-w-5xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-red-600 mb-4">Kullanıcı Bulunamadı</h1>
          <Button onClick={() => router.push("/admin/users")}>Kullanıcı Listesine Dön</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Button variant="secondary" onClick={() => router.push("/admin/users")}>
            ← Geri
          </Button>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-4">Kullanıcı Detayları</h1>
        </div>
        <Button variant="danger" onClick={handleDeleteUser}>
          Kullanıcıyı Sil
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Kullanıcı Bilgileri</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-semibold">
                {user.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">{user.name || "-"}</div>
                <div className="text-sm text-gray-500">{user.email || "-"}</div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
              <select
                value={user.role}
                onChange={(e) => handleRoleChange(e.target.value)}
                className={`input-modern ${user.role === 'admin' ? 'bg-red-100 text-red-800' : user.role === 'moderator' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
              >
                <option value="user">Kullanıcı</option>
                <option value="moderator">Moderatör</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Durum</label>
              <select
                value={user.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className={`input-modern ${user.status === 'active' ? 'bg-green-100 text-green-800' : user.status === 'inactive' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
                <option value="banned">Yasaklı</option>
              </select>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">İstatistikler</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500">Kayıt Tarihi</div>
              <div className="text-lg font-semibold">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "-"}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Son Güncelleme</div>
              <div className="text-lg font-semibold">
                {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "-"}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Son Giriş</div>
              <div className="text-lg font-semibold">
                {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('tr-TR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : "Hiç giriş yapmamış"}
              </div>
            </div>

            <div>
              <div className="text-sm text-gray-500">Giriş Sayısı</div>
              <div className="text-lg font-semibold">{user.loginCount || 0}</div>
            </div>
          </div>
        </Card>
      </div>

      {user.bannedAt && (
        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-semibold">Kullanıcı Yasaklanmış</div>
              <div className="text-sm">
                Yasaklanma Tarihi: {new Date(user.bannedAt).toLocaleDateString('tr-TR')}
              </div>
            </div>
          </div>
        </Card>
      )}
    </main>
  );
}

