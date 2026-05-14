"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { apiFetch } from "../../lib/api";
import { resolveMediaUrl } from "../../lib/images";

export default function CheckoutPage() {
  const { items, clear, loading: cartLoading } = useCart();
  const { user, token, loading: authLoading } = useAuth();
  const siteSettings = useSiteSettings();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedShippingCompany, setSelectedShippingCompany] = useState("");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [orderData, setOrderData] = useState({
    shippingAddress: {
      firstName: "",
      lastName: "",
      company: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Turkey",
      phone: ""
    },
    billingAddress: {
      sameAsShipping: true,
      firstName: "",
      lastName: "",
      company: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "Turkey",
      phone: ""
    },
    paymentMethod: "credit_card",
    notes: ""
  });

  const shippingConfig = siteSettings.shipping || {};
  const paymentConfig = siteSettings.payment || {};
  const shippingCompanies = useMemo(
    () => (Array.isArray(shippingConfig.shippingCompanies) ? shippingConfig.shippingCompanies : []),
    [shippingConfig.shippingCompanies]
  );
  const bankAccounts = useMemo(
    () => (paymentConfig.bankAccounts || []).filter((account) => account && account.isActive !== false),
    [paymentConfig.bankAccounts]
  );
  const selectedBankAccount = bankAccounts.find((account) => {
    const accountId = typeof account._id === "object" && account._id !== null ? account._id.toString() : account._id;
    return accountId === selectedBankAccountId;
  }) || null;
  const paymentOptions = [
    {
      value: "credit_card",
      label: "Kredi Kartı",
      description: "Iyzico ile güvenli ödeme",
      enabled: Boolean(paymentConfig.enableIyzico)
    },
    {
      value: "bank_transfer",
      label: "Havale / EFT",
      description: bankAccounts.length > 0 ? "Banka hesabına transfer ile ödeme" : "Banka hesabı ekleyin",
      enabled: Boolean(paymentConfig.enableBankTransfer && bankAccounts.length > 0)
    },
    {
      value: "cash_on_delivery",
      label: "Kapıda Ödeme",
      description: "Teslimat sırasında ödeme",
      enabled: Boolean(paymentConfig.enableCashOnDelivery)
    }
  ];

  const normalizedItems = items.map((item) => {
    const data = item.productData || {};
    const price = Number(data.price ?? item.price ?? 0);
    const image = resolveMediaUrl(data.images?.[0] || item.image);
    return {
      id: item.product || item.id || item._id,
      quantity: item.quantity || 0,
      name: data.name || item.name || "Ürün",
      price,
      image,
      category: data.category?.name || item.category || "Genel"
    };
  });

  const subtotal = normalizedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const freeShippingThreshold = Number(
    shippingConfig.freeShippingThreshold ??
    siteSettings.features?.freeShippingThreshold ??
    0
  );
  const baseShippingCost = Number(shippingConfig.shippingCost ?? 0);
  const enableFreeShipping = shippingConfig.enableFreeShipping ?? siteSettings.features?.enableFreeShipping ?? false;
  const freeShipping = enableFreeShipping && subtotal >= freeShippingThreshold;
  const shippingCost = freeShipping ? 0 : baseShippingCost;
  const total = subtotal + shippingCost;

  useEffect(() => {
    // AuthContext veya CartContext hala yükleniyorsa bekle
    if (authLoading || cartLoading) {
      return;
    }
    // AuthContext yüklendi ama user yoksa login'e yönlendir
    if (!user) {
      router.push("/login");
      return;
    }
    // CartContext yüklendi ama sepet boşsa cart'a yönlendir
    if (normalizedItems.length === 0) {
      router.push("/cart");
      return;
    }
  }, [user, normalizedItems.length, authLoading, cartLoading, router]);

  useEffect(() => {
    if (shippingCompanies.length === 0) {
      setSelectedShippingCompany("Standart Kargo");
      return;
    }
    const defaultCompany = shippingCompanies.includes(shippingConfig.defaultShippingCompany)
      ? shippingConfig.defaultShippingCompany
      : shippingCompanies[0];
    setSelectedShippingCompany(defaultCompany || "Standart Kargo");
  }, [shippingCompanies, shippingConfig.defaultShippingCompany]);

  useEffect(() => {
    const availableMethods = [];
    if (paymentConfig.enableIyzico) availableMethods.push("credit_card");
    if (paymentConfig.enableBankTransfer && bankAccounts.length > 0) availableMethods.push("bank_transfer");
    if (paymentConfig.enableCashOnDelivery) availableMethods.push("cash_on_delivery");

    if (availableMethods.length === 0) {
      availableMethods.push("cash_on_delivery");
    }

    if (!availableMethods.includes(orderData.paymentMethod)) {
      setOrderData((prev) => ({ ...prev, paymentMethod: availableMethods[0] }));
    }
  }, [
    paymentConfig.enableIyzico,
    paymentConfig.enableBankTransfer,
    paymentConfig.enableCashOnDelivery,
    bankAccounts,
    orderData.paymentMethod
  ]);

  useEffect(() => {
    if (orderData.paymentMethod !== "bank_transfer") {
      setSelectedBankAccountId("");
      return;
    }
    if (bankAccounts.length === 0) {
      setSelectedBankAccountId("");
      return;
    }
    const exists = bankAccounts.some((account) => {
      const accountId = typeof account._id === "object" && account._id !== null ? account._id.toString() : account._id;
      return accountId === selectedBankAccountId;
    });
    if (!exists) {
      const fallbackId = typeof bankAccounts[0]._id === "object" && bankAccounts[0]._id !== null
        ? bankAccounts[0]._id.toString()
        : bankAccounts[0]._id;
      setSelectedBankAccountId(fallbackId || "");
    }
  }, [orderData.paymentMethod, bankAccounts, selectedBankAccountId]);

  const handleInputChange = (field, value, isBilling = false) => {
    const addressType = isBilling ? "billingAddress" : "shippingAddress";
    setOrderData(prev => ({
      ...prev,
      [addressType]: {
        ...prev[addressType],
        [field]: value
      }
    }));
  };

  const handleSameAsShippingChange = (checked) => {
    setOrderData(prev => ({
      ...prev,
      billingAddress: {
        ...prev.billingAddress,
        sameAsShipping: checked,
        ...(checked ? prev.shippingAddress : {})
      }
    }));
  };

  const handleSubmit = async (paymentData) => {
    setLoading(true);
    try {
      if (orderData.paymentMethod === "bank_transfer" && !selectedBankAccountId) {
        throw new Error("Lütfen havale/EFT için bir banka hesabı seçin.");
      }

      const mapAddressForRequest = (address) => ({
        ...address,
        address1: address.address,
        address2: address.address2 || "",
        country: address.country || "Turkey"
      });

      const payload = {
        ...orderData,
        shippingAddress: mapAddressForRequest(orderData.shippingAddress),
        billingAddress: orderData.billingAddress.sameAsShipping
          ? { ...mapAddressForRequest(orderData.shippingAddress), sameAsShipping: true }
          : mapAddressForRequest(orderData.billingAddress),
        items: normalizedItems.map((item) => ({
          product: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        subtotal,
        shipping: shippingCost,
        total,
        shippingCompany: selectedShippingCompany,
        paymentData: undefined
      };

      if (orderData.paymentMethod === "bank_transfer") {
        payload.paymentData = { bankAccountId: selectedBankAccountId };
      } else if (paymentData) {
        payload.paymentData = paymentData;
      }

      const result = await apiFetch("/api/orders", {
        method: "POST",
        token,
        body: payload
      });

      const orderId = result.order?.id ?? result.order?._id ?? result.orderId;
      const orderTotal = result.order?.total ?? total;

      if (orderData.paymentMethod === "credit_card" && orderId && orderTotal != null) {
        const initRes = await apiFetch("/api/payments/iyzico/initialize", {
          method: "POST",
          token,
          body: { orderId: Number(orderId), price: Number(orderTotal), currency: "TRY" }
        });
        if (initRes?.paymentPageUrl) {
          clear();
          window.location.href = initRes.paymentPageUrl;
          return;
        }
      }

      clear();

      if (orderId) {
        router.push(`/payment/success?orderId=${orderId}`);
      } else {
        router.push("/payment/success");
      }
    } catch (error) {
      console.error("Order error:", error);
      alert("Sipariş oluşturulurken bir hata oluştu: " + (error.message || "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  // AuthContext veya CartContext hala yükleniyorsa loading göster
  if (authLoading || cartLoading) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Yükleniyor...</h1>
        </div>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Ödeme Sayfası</h1>
          <p className="text-gray-600 mb-8">Ödeme yapmak için giriş yapmanız gerekiyor</p>
          <Button onClick={() => router.push("/login")} className="btn-primary">
            Giriş Yap
          </Button>
        </div>
      </main>
    );
  }

  // CartContext yüklendi ama sepet boşsa cart'a yönlendir
  if (normalizedItems.length === 0) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-16">
          <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Ödeme Sayfası</h1>
          <p className="text-gray-600 mb-8">Ödeme yapmak için sepetinizde ürün bulunmalıdır</p>
          <Button onClick={() => router.push("/cart")} className="btn-primary">
            Sepete Git
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Ödeme</h1>
        <p className="text-gray-600 mt-2">Siparişinizi tamamlamak için bilgilerinizi girin</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Address */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Teslimat Adresi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ad *</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.firstName}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Soyad *</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  className="input-modern"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Şirket</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.company}
                  onChange={(e) => handleInputChange("company", e.target.value)}
                  className="input-modern"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Adres *</label>
                <textarea
                  value={orderData.shippingAddress.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  className="input-modern"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Şehir *</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">İlçe *</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.state}
                  onChange={(e) => handleInputChange("state", e.target.value)}
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Posta Kodu *</label>
                <input
                  type="text"
                  value={orderData.shippingAddress.zipCode}
                  onChange={(e) => handleInputChange("zipCode", e.target.value)}
                  className="input-modern"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Telefon *</label>
                <input
                  type="tel"
                  value={orderData.shippingAddress.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="input-modern"
                  required
                />
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Tercih Edilen Kargo Firması</label>
              <select
                value={selectedShippingCompany}
                onChange={(e) => setSelectedShippingCompany(e.target.value)}
                className="input-modern"
              >
                {(shippingCompanies.length > 0 ? shippingCompanies : ["Standart Kargo"]).map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                {freeShipping
                  ? "Bu sipariş için kargo ücretsiz."
                  : `Kargo ücreti: ₺${shippingCost.toFixed(2)}${
                      shippingConfig.estimatedDeliveryDays
                        ? ` · Tahmini teslimat: ${shippingConfig.estimatedDeliveryDays} gün`
                        : ""
                    }`}
              </p>
              {!freeShipping && enableFreeShipping && freeShippingThreshold > subtotal && (
                <p className="text-xs text-blue-600">
                  ₺{(freeShippingThreshold - subtotal).toFixed(2)} daha alışveriş yaparak kargonuzu ücretsiz hale getirebilirsiniz.
                </p>
              )}
            </div>
          </Card>

          {/* Billing Address */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Fatura Adresi</h2>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={orderData.billingAddress.sameAsShipping}
                  onChange={(e) => handleSameAsShippingChange(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Teslimat adresi ile aynı</span>
              </label>
            </div>

            {!orderData.billingAddress.sameAsShipping && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ad *</label>
                  <input
                    type="text"
                    value={orderData.billingAddress.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value, true)}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Soyad *</label>
                  <input
                    type="text"
                    value={orderData.billingAddress.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value, true)}
                    className="input-modern"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şirket</label>
                  <input
                    type="text"
                    value={orderData.billingAddress.company}
                    onChange={(e) => handleInputChange("company", e.target.value, true)}
                    className="input-modern"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Adres *</label>
                  <textarea
                    value={orderData.billingAddress.address}
                    onChange={(e) => handleInputChange("address", e.target.value, true)}
                    className="input-modern"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Şehir *</label>
                  <input
                    type="text"
                    value={orderData.billingAddress.city}
                    onChange={(e) => handleInputChange("city", e.target.value, true)}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">İlçe *</label>
                  <input
                    type="text"
                    value={orderData.billingAddress.state}
                    onChange={(e) => handleInputChange("state", e.target.value, true)}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Posta Kodu *</label>
                  <input
                    type="text"
                    value={orderData.billingAddress.zipCode}
                    onChange={(e) => handleInputChange("zipCode", e.target.value, true)}
                    className="input-modern"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Telefon *</label>
                  <input
                    type="tel"
                    value={orderData.billingAddress.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value, true)}
                    className="input-modern"
                    required
                  />
                </div>
              </div>
            )}
          </Card>

          {/* Payment Method */}
          <Card className="p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Ödeme Yöntemi</h2>
              <p className="text-sm text-gray-600">Siparişinizi nasıl ödemek istediğinizi seçin.</p>
            </div>
            <div className="space-y-4">
              {paymentOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start space-x-3 p-4 border rounded-lg cursor-pointer transition-colors ${
                    option.enabled ? "hover:bg-gray-50 border-gray-300" : "opacity-60 border-dashed border-gray-300 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={option.value}
                    checked={orderData.paymentMethod === option.value}
                    onChange={(e) => option.enabled && setOrderData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="mt-1 text-primary focus:ring-primary"
                    disabled={!option.enabled}
                  />
                  <div className="flex-1 space-y-1">
                    <span className="font-medium text-gray-900">{option.label}</span>
                    <p className="text-sm text-gray-600">{option.description}</p>
                    {!option.enabled && option.value === "bank_transfer" && paymentConfig.enableBankTransfer && bankAccounts.length === 0 && (
                      <p className="text-xs text-orange-600">Havale/EFT için banka hesabı tanımlayın.</p>
                    )}
                    {!option.enabled && option.value === "credit_card" && paymentConfig.enableIyzico === false && (
                      <p className="text-xs text-orange-600">Kredi kartı ödemesi şu anda kullanılamıyor.</p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {orderData.paymentMethod === "bank_transfer" && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Banka Hesabı Seçin</h3>
                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-gray-500">Havale/EFT seçeneği için tanımlı banka hesabı bulunmuyor.</p>
                ) : (
                  <div className="space-y-3">
                    {bankAccounts.map((account, index) => {
                      const accountId = typeof account._id === "object" && account._id !== null
                        ? account._id.toString()
                        : account._id || `account-${index}`;
                      return (
                        <label
                          key={accountId}
                          className={`block rounded-lg border p-4 cursor-pointer transition-colors ${
                            selectedBankAccountId === accountId ? "border-primary bg-blue-50" : "border-gray-200 hover:border-primary/60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="space-y-1 text-sm text-gray-700">
                              <p className="font-semibold text-gray-900">{account.bankName}</p>
                              <p>{account.accountName}</p>
                              <p className="font-mono text-xs text-gray-600">{account.iban}</p>
                              {account.branch && <p className="text-xs">{account.branch}</p>}
                              {account.accountNumber && <p className="text-xs">Hesap No: {account.accountNumber}</p>}
                              {account.description && <p className="text-xs text-gray-500">{account.description}</p>}
                            </div>
                            <input
                              type="radio"
                              name="bankAccount"
                              value={accountId}
                              checked={selectedBankAccountId === accountId}
                              onChange={() => setSelectedBankAccountId(accountId)}
                              className="text-primary focus:ring-primary"
                            />
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {orderData.paymentMethod === "cash_on_delivery" && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
                Teslimat sırasında kargo görevlisine nakit ödeme yapabilirsiniz.
              </div>
            )}
            {orderData.paymentMethod === "credit_card" && paymentConfig.enableIyzico === false && (
              <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                Kredi kartı ile ödeme geçici olarak devre dışı bırakıldı.
              </div>
            )}
          </Card>

          {/* Order Notes */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Sipariş Notları</h2>
            <textarea
              value={orderData.notes}
              onChange={(e) => setOrderData(prev => ({ ...prev, notes: e.target.value }))}
              className="input-modern"
              rows={4}
              placeholder="Siparişinizle ilgili özel notlarınızı buraya yazabilirsiniz..."
            />
          </Card>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <Card className="p-6 lg:sticky lg:top-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Sipariş Özeti</h2>
            
            {/* Order Items */}
            <div className="space-y-4 mb-6">
              {normalizedItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
                    <Image
                      src={item.image}
                      alt={item.name || "Ürün görseli"}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1">{item.name}</h3>
                    <p className="text-sm text-gray-600">Adet: {item.quantity}</p>
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    ₺{Number(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Ara Toplam</span>
                <span className="font-medium">₺{subtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Kargo</span>
                <span className="font-medium">
                  {shippingCost === 0 ? (
                    <span className="text-green-600">Ücretsiz</span>
                  ) : (
                    `₺${shippingCost.toFixed(2)}`
                  )}
                </span>
              </div>
              <p className="text-xs text-gray-500">Kargo firması: {selectedShippingCompany || "Standart Kargo"}</p>
              {freeShipping && (
                <p className="text-xs text-green-600">Ücretsiz kargo avantajından yararlandınız.</p>
              )}
              {!freeShipping && enableFreeShipping && freeShippingThreshold > subtotal && (
                <p className="text-xs text-blue-600">
                  ₺{(freeShippingThreshold - subtotal).toFixed(2)} daha alışveriş yaparsanız kargo ücretsiz olacak.
                </p>
              )}
              
              <hr className="border-gray-200" />
              
              <div className="flex justify-between text-lg font-semibold">
                <span>Toplam</span>
                <span>₺{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {orderData.paymentMethod === "bank_transfer" && selectedBankAccount && (
                <div className="rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  <p className="font-medium text-blue-900">Havale/EFT Talimatı</p>
                  <p className="mt-1">
                    Lütfen ödemenizi <strong>{selectedBankAccount.bankName}</strong> / <strong>{selectedBankAccount.accountName}</strong> hesabına yapın.
                  </p>
                  <p className="text-xs mt-2">
                    IBAN: <span className="font-mono">{selectedBankAccount.iban}</span>
                    {selectedBankAccount.description ? ` · ${selectedBankAccount.description}` : ""}
                  </p>
                </div>
              )}
              <Button
                onClick={() => handleSubmit()}
                disabled={loading || (orderData.paymentMethod === "bank_transfer" && !selectedBankAccountId)}
                className="w-full btn-primary"
              >
                {loading ? "Sipariş Gönderiliyor..." : "Siparişi Tamamla"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </main>
  );
}