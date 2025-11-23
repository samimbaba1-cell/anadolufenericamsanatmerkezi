"use client";

export const dynamic = "force-dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";

const COUPON_TYPES = [
  { value: "percentage", label: "Yüzde İndirim (%)", icon: "📊" },
  { value: "fixed", label: "Sabit İndirim (TL)", icon: "💰" },
  { value: "free_shipping", label: "Ücretsiz Kargo", icon: "🚚" },
  { value: "buy_x_get_y", label: "X Al Y Öde", icon: "🎁" }
];

const CUSTOMER_GROUPS = [
  { value: "all", label: "Tüm Müşteriler" },
  { value: "new_customers", label: "Yeni Müşteriler" },
  { value: "returning_customers", label: "Dönen Müşteriler" },
  { value: "vip", label: "VIP Müşteriler" }
];

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  type: "percentage",
  value: 0,
  minOrderAmount: 0,
  maxDiscountAmount: 0,
  usageLimit: 0,
  usagePerCustomer: 0,
  isActive: true,
  startDate: "",
  endDate: "",
  applicableProducts: [],
  applicableCategories: [],
  customerGroups: "all",
  buyQuantity: 0,
  getQuantity: 0
};

export default function CouponsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, activeCount: 0, totalDiscountValue: 0 });
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [filters, setFilters] = useState({ search: "", status: "", type: "", customerGroup: "" });
  const [formErrors, setFormErrors] = useState({});

  const formatCurrency = useCallback(
    (value = 0) =>
      new Intl.NumberFormat("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 2
      }).format(Number(value) || 0),
    []
  );

  const fetchOptions = useCallback(async () => {
    if (!token) return;
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        apiFetch("/api/products/admin?limit=100&sort=name&sortDir=asc", { token }),
        apiFetch("/api/categories?all=true", { token })
      ]);

      const productList = productsRes?.items || productsRes || [];
      setProducts(productList);

      const categoryList = Array.isArray(categoriesRes) ? categoriesRes : categoriesRes?.items || [];
      setCategories(categoryList);
    } catch (error) {
      console.error("Dropdown load error:", error);
      showToast(error.message || "Ürün/Kategori listesi alınamadı", "error");
    }
  }, [token, showToast]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", "1");
    params.set("limit", "50");
    return params.toString();
  }, [filters]);

  const loadCoupons = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch(`/api/coupons?${queryString}`, { token });
      setCoupons(Array.isArray(data.items) ? data.items : data.items || []);
      setSummary(data.summary || { totalCount: 0, activeCount: 0, totalDiscountValue: 0 });
    } catch (error) {
      console.error("Coupons load error:", error);
      showToast(error.message || "Kuponlar yüklenirken hata oluştu!", "error");
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [token, queryString, showToast]);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchOptions();
    }
  }, [user?.role, fetchOptions]);

  useEffect(() => {
    if (user?.role === "admin") {
      loadCoupons();
    }
  }, [user?.role, loadCoupons]);

  const resetForm = () => {
    setFormData(EMPTY_FORM);
    setEditingCoupon(null);
  setFormErrors({});
  };

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code || "",
      name: coupon.name || "",
      description: coupon.description || "",
      type: coupon.type || "percentage",
      value: coupon.value || 0,
      minOrderAmount: coupon.minOrderAmount || 0,
      maxDiscountAmount: coupon.maxDiscountAmount || 0,
      usageLimit: coupon.usageLimit || 0,
      usagePerCustomer: coupon.usagePerCustomer || 0,
      isActive: Boolean(coupon.isActive),
      startDate: coupon.startDate ? coupon.startDate.slice(0, 10) : "",
      endDate: coupon.endDate ? coupon.endDate.slice(0, 10) : "",
      applicableProducts: coupon.applicableProducts?.map((p) => p._id || p) || [],
      applicableCategories: coupon.applicableCategories?.map((c) => c._id || c) || [],
      customerGroups: coupon.customerGroups || "all",
      buyQuantity: coupon.buyQuantity || 0,
      getQuantity: coupon.getQuantity || 0
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Bu kuponu silmek istediğinizden emin misiniz?")) return;
    try {
      await apiFetch(`/api/coupons/${id}`, { method: "DELETE", token });
      showToast("Kupon silindi!", "success");
      loadCoupons();
    } catch (error) {
      console.error("Coupon delete error:", error);
      showToast(error.message || "Kupon silinirken hata oluştu!", "error");
    }
  };

  const toggleActive = async (coupon) => {
    try {
      await apiFetch(`/api/coupons/${coupon._id}/status`, {
        method: "PATCH",
        body: { isActive: !coupon.isActive },
        token
      });
      showToast(`Kupon ${!coupon.isActive ? "aktifleştirildi" : "pasifleştirildi"}!`, "success");
      loadCoupons();
    } catch (error) {
      console.error("Coupon toggle error:", error);
      showToast(error.message || "Kupon durumu güncellenirken hata oluştu!", "error");
    }
  };

  const validateForm = useCallback(() => {
    const errors = {};
    if (!formData.code.trim()) errors.code = "Kod zorunlu";
    if (!/^[A-Z0-9_-]{3,20}$/.test(formData.code.trim().toUpperCase())) {
      errors.code = "Kod 3-20 karakter olmalı (A-Z, 0-9, -, _)";
    }
    if (!formData.name.trim()) errors.name = "Ad zorunlu";
    if (["percentage", "fixed"].includes(formData.type) && Number(formData.value) <= 0) {
      errors.value = "İndirim değeri pozitif olmalı";
    }
    if (formData.type === "percentage" && Number(formData.value) > 100) {
      errors.value = "Yüzde indirim 0-100 arasında olmalı";
    }
    if (formData.type === "buy_x_get_y") {
      if (Number(formData.buyQuantity) <= 0 || Number(formData.getQuantity) <= 0) {
        errors.buyQuantity = "X/Y adetleri sıfırdan büyük olmalı";
      }
    }
    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      errors.endDate = "Bitiş tarihi başlangıçtan önce olamaz";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (!validateForm()) {
        showToast("Lütfen işaretlenen alanları düzeltin", "error");
        setSaving(false);
        return;
      }
      const payload = {
        ...formData,
        value: Number(formData.value),
        minOrderAmount: Number(formData.minOrderAmount),
        maxDiscountAmount: Number(formData.maxDiscountAmount),
        usageLimit: Number(formData.usageLimit),
        usagePerCustomer: Number(formData.usagePerCustomer),
        buyQuantity: Number(formData.buyQuantity),
        getQuantity: Number(formData.getQuantity)
      };

      if (editingCoupon) {
        await apiFetch(`/api/coupons/${editingCoupon._id}`, { method: "PUT", body: payload, token });
        showToast("Kupon güncellendi!", "success");
      } else {
        await apiFetch("/api/coupons", { method: "POST", body: payload, token });
        showToast("Kupon oluşturuldu!", "success");
      }

      setShowForm(false);
      resetForm();
      loadCoupons();
    } catch (error) {
      console.error("Coupon save error:", error);
      showToast(error.message || "Kupon kaydedilirken hata oluştu!", "error");
    } finally {
      setSaving(false);
    }
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, code: result }));
  };

  const formatValue = (coupon) => {
    if (coupon.type === "percentage") return `%${coupon.value}`;
    if (coupon.type === "fixed") return `${coupon.value} TL`;
    if (coupon.type === "free_shipping") return "Ücretsiz Kargo";
    if (coupon.type === "buy_x_get_y") return `${coupon.buyQuantity} al ${coupon.getQuantity} öde`;
    return coupon.value;
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (authLoading) {
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
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kupon Yönetimi</h1>
          <p className="text-sm text-gray-500">İndirim kuponlarını yönetin</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(true); }}>+ Yeni Kupon</Button>
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
        <div>Toplam Kupon: <span className="font-semibold text-gray-900">{summary.totalCount}</span></div>
        <div>Aktif Kupon: <span className="font-semibold text-green-600">{summary.activeCount}</span></div>
        <div>Toplam İndirim Değeri: <span className="font-semibold text-blue-600">{formatCurrency(summary.totalDiscountValue)}</span></div>
        <div>Kodlar: <span className="font-mono">{coupons.slice(0, 3).map((c) => c.code).join(', ')}{coupons.length > 3 ? '...' : ''}</span></div>
      </Card>

      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="search"
            placeholder="Kupon ara..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="input-modern"
          />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input-modern"
          >
            <option value="">Durum (Tümü)</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange('type', e.target.value)}
            className="input-modern"
          >
            <option value="">Tür (Tümü)</option>
            {COUPON_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={filters.customerGroup}
            onChange={(e) => handleFilterChange('customerGroup', e.target.value)}
            className="input-modern"
          >
            <option value="">Müşteri Grubu (Tümü)</option>
            {CUSTOMER_GROUPS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <Button variant="secondary" onClick={() => setFilters({ search: "", status: "", type: "", customerGroup: "" })}>Filtreleri Temizle</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </Card>
          ))
        ) : coupons.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-600">Kupon bulunamadı. Yeni kupon oluşturun.</div>
        ) : (
          coupons.map((coupon) => (
            <Card key={coupon._id} className="p-6 hover:shadow-lg transition-shadow space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase text-gray-500">{COUPON_TYPES.find((t) => t.value === coupon.type)?.label || coupon.type}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">{coupon.code}</span>
                    <span className="text-sm text-green-600 font-medium">{formatValue(coupon)}</span>
                  </div>
                  <div className="text-sm text-gray-600">{coupon.name}</div>
                </div>
                <div className="flex gap-2 text-sm">
                  <button onClick={() => handleEdit(coupon)} className="text-blue-600 hover:underline">Düzenle</button>
                  <button onClick={() => toggleActive(coupon)} className="text-yellow-600 hover:underline">
                    {coupon.isActive ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                  <button onClick={() => handleDelete(coupon._id)} className="text-red-600 hover:underline">Sil</button>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                <div><span className="font-medium text-gray-700">Min. Sipariş:</span> {formatCurrency(coupon.minOrderAmount)}</div>
                <div><span className="font-medium text-gray-700">Maks. İndirim:</span> {formatCurrency(coupon.maxDiscountAmount)}</div>
                <div><span className="font-medium text-gray-700">Kullanım Limiti:</span> {coupon.usageLimit || 'Sınırsız'}</div>
                <div><span className="font-medium text-gray-700">Kullanım:</span> {coupon.usedCount || 0}/{coupon.usageLimit || '∞'}</div>
                <div><span className="font-medium text-gray-700">Kişi Limiti:</span> {coupon.usagePerCustomer > 0 ? coupon.usagePerCustomer : 'Sınırsız'}</div>
                <div><span className="font-medium text-gray-700">Başlangıç:</span> {coupon.startDate ? new Date(coupon.startDate).toLocaleDateString('tr-TR') : '-'}</div>
                <div><span className="font-medium text-gray-700">Bitiş:</span> {coupon.endDate ? new Date(coupon.endDate).toLocaleDateString('tr-TR') : '-'}</div>
              </div>
              <div className="text-xs text-gray-500">Müşteri Grubu: {CUSTOMER_GROUPS.find((g) => g.value === coupon.customerGroups)?.label || coupon.customerGroups}</div>
            </Card>
          ))
        )}
      </div>

      {showForm && (
        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{editingCoupon ? 'Kuponu Düzenle' : 'Yeni Kupon Oluştur'}</h2>
              <div className="flex gap-2">
                <Button type="button" variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>İptal</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kod *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className={`input-modern ${formErrors.code ? "border-red-500" : ""}`}
                    required
                  />
                  <Button type="button" variant="secondary" onClick={generateCode}>Oluştur</Button>
                </div>
                {formErrors.code && <p className="mt-1 text-xs text-red-600">{formErrors.code}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className={`input-modern ${formErrors.name ? "border-red-500" : ""}`}
                  required
                />
                {formErrors.name && <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Açıklama</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="input-modern"
                  rows={3}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tür *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value }))}
                  className="input-modern"
                >
                  {COUPON_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İndirim Değeri</label>
                <input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                  className={`input-modern ${formErrors.value ? "border-red-500" : ""}`}
                  disabled={formData.type === 'free_shipping'}
                />
                {formErrors.value && <p className="mt-1 text-xs text-red-600">{formErrors.value}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Müşteri Grubu</label>
                <select
                  value={formData.customerGroups}
                  onChange={(e) => setFormData((prev) => ({ ...prev, customerGroups: e.target.value }))}
                  className="input-modern"
                >
                  {CUSTOMER_GROUPS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min. Sipariş (TL)</label>
                <input
                  type="number"
                  value={formData.minOrderAmount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, minOrderAmount: e.target.value }))}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max. İndirim (TL)</label>
                <input
                  type="number"
                  value={formData.maxDiscountAmount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, maxDiscountAmount: e.target.value }))}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanım Limiti</label>
                <input
                  type="number"
                  value={formData.usageLimit}
                  onChange={(e) => setFormData((prev) => ({ ...prev, usageLimit: e.target.value }))}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Kişi Başına Kullanım</label>
                <input
                  type="number"
                  value={formData.usagePerCustomer}
                  onChange={(e) => setFormData((prev) => ({ ...prev, usagePerCustomer: e.target.value }))}
                  className="input-modern"
                />
              </div>
            </div>

            {formData.type === 'buy_x_get_y' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alınacak Ürün Adedi</label>
                  <input
                    type="number"
                    value={formData.buyQuantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, buyQuantity: e.target.value }))}
                    className={`input-modern ${formErrors.buyQuantity ? "border-red-500" : ""}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ödenecek Ürün Adedi</label>
                  <input
                    type="number"
                    value={formData.getQuantity}
                    onChange={(e) => setFormData((prev) => ({ ...prev, getQuantity: e.target.value }))}
                    className={`input-modern ${formErrors.buyQuantity ? "border-red-500" : ""}`}
                  />
                </div>
                {formErrors.buyQuantity && <p className="text-xs text-red-600 md:col-span-2">{formErrors.buyQuantity}</p>}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Başlangıç Tarihi</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="input-modern"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bitiş Tarihi</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                  className={`input-modern ${formErrors.endDate ? "border-red-500" : ""}`}
                />
                {formErrors.endDate && <p className="mt-1 text-xs text-red-600">{formErrors.endDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Uygulanacak Ürünler</label>
                <select
                  multiple
                  value={formData.applicableProducts.map(String)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, applicableProducts: Array.from(e.target.selectedOptions).map((opt) => opt.value) }))}
                  className="input-modern h-32"
                >
                  {products.map((product) => (
                    <option key={product._id} value={product._id}>{product.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Uygulanacak Kategoriler</label>
                <select
                  multiple
                  value={formData.applicableCategories.map(String)}
                  onChange={(e) => setFormData((prev) => ({ ...prev, applicableCategories: Array.from(e.target.selectedOptions).map((opt) => opt.value) }))}
                  className="input-modern h-32"
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>{category.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-primary border-gray-300 rounded"
              />
              <span className="text-sm text-gray-700">Kupon aktif</span>
            </div>
          </form>
        </Card>
      )}
    </main>
  );
}
