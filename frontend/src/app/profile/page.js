"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSkeleton from "../../components/LoadingSkeleton";
import { useLocale } from "../../context/LocaleContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const EMPTY_ADDRESS = {
  street: "",
  city: "",
  state: "",
  zipCode: "",
  country: "Turkey"
};

function normalizeField(v) {
  if (v == null || v === "null" || v === "undefined") return "";
  return String(v);
}

/** Her zaman tanımlı string alanlar; kontrollü input asla undefined almaz. */
function normalizeProfileData(raw) {
  const data = raw && typeof raw === "object" ? raw : {};
  const addrIn = data.address && typeof data.address === "object" ? data.address : {};
  return {
    firstName: normalizeField(data.firstName),
    lastName: normalizeField(data.lastName),
    email: normalizeField(data.email),
    phone: normalizeField(data.phone),
    address: {
      ...EMPTY_ADDRESS,
      street: normalizeField(addrIn.street),
      city: normalizeField(addrIn.city),
      state: normalizeField(addrIn.state),
      zipCode: normalizeField(addrIn.zipCode),
      country: normalizeField(addrIn.country) || "Turkey"
    }
  };
}

const INITIAL_PROFILE = normalizeProfileData({});

export default function ProfilePage() {
  const { routes, paths, t } = useLocale();
  const { user, logout, refreshUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [emailVerified, setEmailVerified] = useState(false);
  const [profileData, setProfileData] = useState(INITIAL_PROFILE);

  useEffect(() => {
    // AuthContext hala yükleniyorsa bekle
    if (authLoading) {
      return;
    }
    // AuthContext yüklendi ama user yoksa login'e yönlendir
    if (!user) {
      router.push(routes.login);
      return;
    }
    loadProfileData();
    loadOrders();
  }, [user, authLoading, router]);

  const loadProfileData = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        const userData = data.user || {};
        setEmailVerified(userData.emailVerified || false);
        const nameParts = (userData.name || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ");
        const profile = userData.profile || {};
        const rawAddr = profile.address && typeof profile.address === "object" ? profile.address : {};

        setProfileData(
          normalizeProfileData({
            firstName,
            lastName,
            email: userData.email,
            phone: profile.phone,
            address: { ...EMPTY_ADDRESS, ...rawAddr }
          })
        );
      }
    } catch (error) {
      console.error("Profile load error:", error);
    }
  };

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        if (Array.isArray(data)) {
          setOrders(data);
        } else if (Array.isArray(data.orders)) {
          setOrders(data.orders);
        } else {
          setOrders([]);
        }
      }
    } catch (error) {
      console.error("Orders load error:", error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: `${profileData.firstName} ${profileData.lastName}`.trim(),
        profile: {
          phone: profileData.phone,
          address: profileData.address
        }
      };

      const response = await fetch(`${API_URL}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert("Profil başarıyla güncellendi");
        await refreshUser();
        loadProfileData();
      } else {
        throw new Error("Profil güncellenemedi");
      }
    } catch (error) {
      alert("Profil güncellenirken bir hata oluştu: " + error.message);
    }
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    const v = value == null ? "" : String(value);
    setProfileData((prev) => {
      const p = normalizeProfileData(prev);
      if (field.includes(".")) {
        const [parent, child] = field.split(".");
        if (parent === "address") {
          return normalizeProfileData({
            ...p,
            address: { ...p.address, [child]: v }
          });
        }
        return normalizeProfileData({
          ...p,
          [parent]: { ...(p[parent] && typeof p[parent] === "object" ? p[parent] : {}), [child]: v }
        });
      }
      return normalizeProfileData({ ...p, [field]: v });
    });
  };

  const getOrderStatus = (status) => {
    const statusMap = {
      pending: { text: "Beklemede", color: "text-yellow-600 bg-yellow-100" },
      processing: { text: "İşleniyor", color: "text-blue-600 bg-blue-100" },
      shipped: { text: "Kargoya Verildi", color: "text-purple-600 bg-purple-100" },
      delivered: { text: "Teslim Edildi", color: "text-green-600 bg-green-100" },
      cancelled: { text: "İptal Edildi", color: "text-red-600 bg-red-100" }
    };
    return statusMap[status] || { text: "Bilinmiyor", color: "text-gray-600 bg-gray-100" };
  };

  // AuthContext hala yükleniyorsa loading göster
  if (authLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSkeleton />
      </main>
    );
  }

  // AuthContext yüklendi ama user yoksa login'e yönlendir
  if (!user) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Giriş Yapın</h1>
          <p className="text-gray-600 mb-8">Profil sayfasına erişmek için giriş yapmanız gerekiyor</p>
          <Button onClick={() => router.push(routes.login)} className="btn-primary">
            Giriş Yap
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profilim</h1>
        <p className="text-gray-600 mt-2">Hesap bilgilerinizi yönetin ve siparişlerinizi takip edin</p>
      </div>

      {/* Email Verification Alert */}
      {user && !emailVerified && (
        <Card className="p-4 mb-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-yellow-800 mb-1">Email Adresiniz Doğrulanmadı</h3>
              <p className="text-sm text-yellow-700 mb-2">Lütfen email adresinizi doğrulayın. Email adresinizi doğrulamak için kayıt olduğunuzda gönderilen email&apos;i kontrol edin.</p>
              <button
                onClick={async () => {
                  try {
                    const { apiFetch } = await import("../../lib/api");
                    const token = localStorage.getItem("token");
                    await apiFetch("/api/auth/resend-verification", { method: "POST", token });
                    alert("Doğrulama emaili tekrar gönderildi. Lütfen email adresinizi kontrol edin.");
                  } catch (error) {
                    alert(error.message || "Email gönderilirken bir hata oluştu.");
                  }
                }}
                className="text-sm text-yellow-800 hover:text-yellow-900 font-medium underline"
              >
                Doğrulama Emailini Tekrar Gönder
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Address Completion Encouragement */}
      {user && (!profileData.address?.street || !profileData.address?.city || !profileData.phone) && (
        <Card className="p-4 mb-6 border-blue-200 bg-blue-50">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-800 mb-1">Profil Bilgilerinizi Tamamlayın</h3>
              <p className="text-sm text-blue-700">
                Adres ve telefon bilgilerinizi ekleyerek daha hızlı alışveriş yapabilirsiniz. Bu bilgiler siparişlerinizde otomatik olarak kullanılacaktır.
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Profile Form */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Kişisel Bilgiler</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ad *</label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Soyad *</label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">E-posta *</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
                  <input
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    className="input-modern"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Adres Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                    <input
                      type="text"
                      value={profileData.address.street}
                      onChange={(e) => handleInputChange("address.street", e.target.value)}
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Şehir</label>
                    <input
                      type="text"
                      value={profileData.address.city}
                      onChange={(e) => handleInputChange("address.city", e.target.value)}
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">İlçe</label>
                    <input
                      type="text"
                      value={profileData.address.state}
                      onChange={(e) => handleInputChange("address.state", e.target.value)}
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Posta Kodu</label>
                    <input
                      type="text"
                      value={profileData.address.zipCode}
                      onChange={(e) => handleInputChange("address.zipCode", e.target.value)}
                      className="input-modern"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ülke</label>
                    <select
                      value={profileData.address.country}
                      onChange={(e) => handleInputChange("address.country", e.target.value)}
                      className="input-modern"
                    >
                      <option value="Turkey">Türkiye</option>
                      <option value="US">Amerika Birleşik Devletleri</option>
                      <option value="UK">Birleşik Krallık</option>
                      <option value="DE">Almanya</option>
                      <option value="FR">Fransa</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "Kaydediliyor..." : "Profili Güncelle"}
                </Button>
              </div>
            </form>
          </Card>

          {/* Recent Orders */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Son Siparişlerim</h2>
            {orders.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-600">Henüz siparişiniz bulunmuyor</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.slice(0, 5).map((order) => {
                  const status = getOrderStatus(order.status);
                  return (
                    <div key={order._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">Sipariş #{order.orderNumber}</h3>
                          <p className="text-sm text-gray-600">
                            {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status.color}`}>
                            {status.text}
                          </div>
                          <p className="text-lg font-semibold text-gray-900 mt-1">
                            ₺{Number(order.total).toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => router.push(paths.order(order._id))}
                        >
                          Detayları Gör
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Account Info */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hesap Bilgileri</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">E-posta</p>
                <p className="font-medium text-gray-900">{user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Üyelik Tarihi</p>
                <p className="font-medium text-gray-900">
                  {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Toplam Sipariş</p>
                <p className="font-medium text-gray-900">{orders.length}</p>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Hızlı İşlemler</h3>
            <div className="space-y-3">
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push(routes.orders)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Tüm Siparişlerim
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push(routes.wishlist)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Favorilerim
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-start"
                onClick={() => router.push(routes.cart)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 11-4 0v-6m4 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
                </svg>
                Sepetim
              </Button>
            </div>
          </Card>

          {/* Logout */}
          <Card className="p-6">
            <Button
              variant="secondary"
              className="w-full text-red-600 hover:text-red-800"
              onClick={logout}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Çıkış Yap
            </Button>
          </Card>
        </div>
      </div>
    </main>
  );
}