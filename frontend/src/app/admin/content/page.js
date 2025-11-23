"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";

const DEFAULT_CONTENT = {
  about: {
    title: "Hakkımızda",
    heroTitle: "Anadolu Feneri Cam Sanat Merkezi",
    heroSubtitle: "Kaliteli ürünler, güvenilir hizmet",
    mission: "",
    vision: "",
    companyInfo: {
      founded: "2020",
      location: "İstanbul, Türkiye",
      expertise: "E-ticaret ve Dijital Pazarlama",
      customers: "10,000+"
    }
  },
  contact: {
    title: "İletişim",
    heroTitle: "İletişim",
    heroSubtitle: "Sorularınız, önerileriniz veya destek talepleriniz için bizimle iletişime geçin",
    email: "info@anadolufenericamsanatmerkezi.com",
    supportEmail: "destek@anadolufenericamsanatmerkezi.com",
    phone: "+90 (212) 555 0123",
    phone2: "+90 (212) 555 0124",
    address: "Maslak Mahallesi, Büyükdere Caddesi\nNo: 123, Şişli/İstanbul",
    workingHours: {
      weekdays: "Pazartesi - Cuma: 09:00 - 18:00",
      saturday: "Cumartesi: 09:00 - 14:00",
      sunday: "Pazar: Kapalı"
    }
  },
  faq: [],
  legal: {
    privacyPolicy: {
      title: "Gizlilik Politikası",
      summary: "Kişisel verilerinizin korunması ve gizliliğiniz bizim için önemlidir.",
      content:
        "Gizliliğiniz bizim için son derece önemlidir. Anadolu Feneri Cam Sanat Merkezi olarak kişisel verilerinizi KVKK kapsamında saklıyor, üçüncü taraflarla paylaşmıyor ve yalnızca sipariş süreçlerinizi yönetmek için kullanıyoruz. Detaylı bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.",
      lastUpdated: new Date().toISOString()
    },
    termsOfUse: {
      title: "Kullanım Şartları",
      summary: "Web sitemizi kullanırken uymamız gereken temel kurallar.",
      content:
        "Bu siteyi kullanarak kullanım şartlarını kabul etmiş sayılırsınız. Satın aldığınız ürünlerle ilgili tüm işlemler 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümlerine tabidir. Ayrıntılı kullanım şartları için müşteri temsilcilerimizle iletişime geçebilirsiniz.",
      lastUpdated: new Date().toISOString()
    },
    cookiePolicy: {
      title: "Çerez Politikası",
      summary: "Çerezler ne amaçla kullanılıyor?",
      content:
        "Sitemizi daha iyi deneyimlemeniz ve kişiselleştirilmiş içerik sunmak için çerezler kullanıyoruz. Çerez tercihlerinizi tarayıcınız üzerinden yönetebilirsiniz. Çerez kullanımına ilişkin detaylı bilgi için müşteri hizmetlerimize ulaşabilirsiniz.",
      lastUpdated: new Date().toISOString()
    }
  },
  support: {
    customerService: {
      title: "Müşteri Hizmetleri",
      subtitle: "Sorularınız için 7/24 buradayız",
      description:
        "Siparişleriniz, iade süreçleriniz ve tüm sorularınız için müşteri hizmetleri ekibimizle iletişime geçebilirsiniz.",
      email: "destek@anadolufenericamsanatmerkezi.com",
      phone: "+90 (212) 555 0123",
      whatsapp: "+90 (545) 555 0123",
      supportHours: {
        weekdays: "Pazartesi - Cuma: 09:00 - 18:00",
        saturday: "Cumartesi: 09:00 - 14:00",
        sunday: "Pazar: Kapalı"
      },
      responseTime: "Mesajlarınıza en geç 24 saat içinde dönüş yapıyoruz.",
      faqHint: "Yanıtınızı bulamadıysanız bizimle iletişime geçmekten çekinmeyin."
    },
    paymentOptions: {
      title: "Ödeme Yöntemleri",
      subtitle: "Size en uygun ödeme seçeneğini seçin.",
      securePaymentText: "Tüm ödemeler 256-bit SSL sertifikası ile güvence altındadır.",
      methods: [
        {
          key: "credit-card",
          name: "Kredi / Banka Kartı",
          description: "Visa, MasterCard, Troy ve American Express kartlarıyla tek çekim veya taksitli ödeme yapabilirsiniz.",
          details: "",
          enabled: true
        },
        {
          key: "iyzico",
          name: "İyzico Güvenli Ödeme",
          description: "3D Secure destekli İyzico ödeme altyapısı ile güvenli alışveriş.",
          details: "",
          enabled: true
        },
        {
          key: "bank-transfer",
          name: "Havale / EFT",
          description: "Sipariş sonrası belirtilen banka hesaplarımıza havale veya EFT yapabilirsiniz.",
          details: "Ödeme açıklamasına sipariş numaranızı eklemeyi unutmayın.",
          enabled: true
        },
        {
          key: "cash-on-delivery",
          name: "Kapıda Ödeme",
          description: "Belirli ürünlerde ve bölgelerde kapıda ödeme seçeneği sunuyoruz.",
          details: "Kapıda ödeme hizmet bedeli kargo firmasına göre değişiklik gösterebilir.",
          enabled: false
        }
      ]
    }
  }
};

export default function ContentPage() {
  const { user, token, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [activeTab, setActiveTab] = useState("about");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadContent = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await apiFetch("/api/content/admin", { token });
      setContent({
        about: { ...DEFAULT_CONTENT.about, ...(data.about || {}) },
        contact: { ...DEFAULT_CONTENT.contact, ...(data.contact || {}) },
        faq: Array.isArray(data.faq) ? data.faq : [],
        legal: {
          privacyPolicy: {
            ...DEFAULT_CONTENT.legal.privacyPolicy,
            ...(data.legal?.privacyPolicy || {})
          },
          termsOfUse: {
            ...DEFAULT_CONTENT.legal.termsOfUse,
            ...(data.legal?.termsOfUse || {})
          },
          cookiePolicy: {
            ...DEFAULT_CONTENT.legal.cookiePolicy,
            ...(data.legal?.cookiePolicy || {})
          }
        },
        support: {
          customerService: {
            ...DEFAULT_CONTENT.support.customerService,
            ...(data.support?.customerService || {}),
            supportHours: {
              ...DEFAULT_CONTENT.support.customerService.supportHours,
              ...(data.support?.customerService?.supportHours || {})
            }
          },
          paymentOptions: {
            ...DEFAULT_CONTENT.support.paymentOptions,
            ...(data.support?.paymentOptions || {}),
            methods: Array.isArray(data.support?.paymentOptions?.methods)
              ? data.support.paymentOptions.methods
                  .filter((method) => method?.name)
                  .map((method) => ({
                    key: "",
                    name: "",
                    description: "",
                    details: "",
                    enabled: true,
                    ...method
                  }))
              : DEFAULT_CONTENT.support.paymentOptions.methods
          }
        }
      });
    } catch (error) {
      console.error("Content load error", error);
      showToast(error.message || "İçerik yüklenemedi", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, token]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    try {
      const payload = {
        about: content.about,
        contact: content.contact,
        faq: content.faq.filter((item) => item.question?.trim() && item.answer?.trim()),
        legal: {
          privacyPolicy: content.legal.privacyPolicy,
          termsOfUse: content.legal.termsOfUse,
          cookiePolicy: content.legal.cookiePolicy
        },
        support: {
          customerService: content.support.customerService,
          paymentOptions: {
            ...content.support.paymentOptions,
            methods: content.support.paymentOptions.methods
              .filter((method) => method.name?.trim())
              .map((method) => ({
                ...method,
                name: method.name.trim(),
                key: method.key?.trim() || method.name.trim().toLowerCase().replace(/[^a-z0-9]+/gi, "-")
              }))
          }
        }
      };
      await apiFetch("/api/content", { method: "PUT", token, body: payload });
      showToast("İçerik güncellendi", "success");
      await loadContent();
    } catch (error) {
      console.error("Content save error", error);
      showToast(error.message || "İçerik kaydedilemedi", "error");
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (section, key, value) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [key]: value
      }
    }));
  };

  const updateNested = (section, parent, key, value) => {
    setContent((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parent]: {
          ...prev[section][parent],
          [key]: value
        }
      }
    }));
  };

  const updatePolicy = (policyKey, field, value) => {
    setContent((prev) => ({
      ...prev,
      legal: {
        ...prev.legal,
        [policyKey]: {
          ...prev.legal[policyKey],
          [field]: value
        }
      }
    }));
  };

  const updateSupport = (field, value) => {
    setContent((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        customerService: {
          ...prev.support.customerService,
          [field]: value
        }
      }
    }));
  };

  const updateSupportHours = (field, value) => {
    setContent((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        customerService: {
          ...prev.support.customerService,
          supportHours: {
            ...prev.support.customerService.supportHours,
            [field]: value
          }
        }
      }
    }));
  };

  const updatePaymentOptions = (field, value) => {
    setContent((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        paymentOptions: {
          ...prev.support.paymentOptions,
          [field]: value
        }
      }
    }));
  };

  const updatePaymentMethod = (index, key, value) => {
    setContent((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        paymentOptions: {
          ...prev.support.paymentOptions,
          methods: prev.support.paymentOptions.methods.map((method, i) =>
            i === index
              ? {
                  ...method,
                  [key]: key === "enabled" ? Boolean(value) : value
                }
              : method
          )
        }
      }
    }));
  };

  const addPaymentMethod = () => {
    setContent((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        paymentOptions: {
          ...prev.support.paymentOptions,
          methods: [
            ...prev.support.paymentOptions.methods,
            {
              key: "",
              name: "",
              description: "",
              details: "",
              enabled: true
            }
          ]
        }
      }
    }));
  };

  const removePaymentMethod = (index) => {
    setContent((prev) => ({
      ...prev,
      support: {
        ...prev.support,
        paymentOptions: {
          ...prev.support.paymentOptions,
          methods: prev.support.paymentOptions.methods.filter((_, i) => i !== index)
        }
      }
    }));
  };

  const addFaq = () => {
    setContent((prev) => ({
      ...prev,
      faq: [...prev.faq, { question: "", answer: "" }]
    }));
  };

  const removeFaq = (index) => {
    setContent((prev) => ({
      ...prev,
      faq: prev.faq.filter((_, i) => i !== index)
    }));
  };

  const updateFaq = (index, key, value) => {
    setContent((prev) => ({
      ...prev,
      faq: prev.faq.map((item, i) => (i === index ? { ...item, [key]: value } : item))
    }));
  };

  const faqCount = useMemo(() => content.faq.length, [content.faq.length]);

  if (authLoading || loading) {
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
        <h1 className="text-2xl sm:text-3xl font-semibold">İçerik Yönetimi</h1>
        <p className="text-gray-600">Hakkımızda, iletişim, hukuki belgeler ve müşteri hizmetleri içeriklerini düzenleyin</p>
      </div>

      <Card className="p-4">
        <nav className="flex flex-wrap gap-4">
          <button
            onClick={() => setActiveTab("about")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "about" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Hakkımızda
          </button>
          <button
            onClick={() => setActiveTab("contact")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "contact" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            İletişim
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "faq" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            SSS ({faqCount})
          </button>
          <button
            onClick={() => setActiveTab("legal")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "legal" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Hukuki Dokümanlar
          </button>
          <button
            onClick={() => setActiveTab("support")}
            className={`rounded-md px-4 py-2 text-sm font-medium ${activeTab === "support" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600"}`}
          >
            Müşteri Hizmetleri & Ödeme
          </button>
        </nav>
      </Card>

      {activeTab === "about" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Hakkımızda Başlıklar</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Ana Başlık</span>
                <input
                  type="text"
                  value={content.about.heroTitle}
                  onChange={(e) => updateSection("about", "heroTitle", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Alt Başlık</span>
                <input
                  type="text"
                  value={content.about.heroSubtitle}
                  onChange={(e) => updateSection("about", "heroSubtitle", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Misyon</span>
              <textarea
                rows={3}
                value={content.about.mission}
                onChange={(e) => updateSection("about", "mission", e.target.value)}
                className="input-modern"
              />
            </label>
            <label className="space-y-2 text-sm text-gray-700">
              <span>Vizyon</span>
              <textarea
                rows={3}
                value={content.about.vision}
                onChange={(e) => updateSection("about", "vision", e.target.value)}
                className="input-modern"
              />
            </label>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Şirket Bilgileri</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Kuruluş Yılı</span>
                <input
                  type="text"
                  value={content.about.companyInfo.founded}
                  onChange={(e) => updateNested("about", "companyInfo", "founded", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Konum</span>
                <input
                  type="text"
                  value={content.about.companyInfo.location}
                  onChange={(e) => updateNested("about", "companyInfo", "location", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Uzmanlık</span>
                <input
                  type="text"
                  value={content.about.companyInfo.expertise}
                  onChange={(e) => updateNested("about", "companyInfo", "expertise", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Müşteri Sayısı</span>
                <input
                  type="text"
                  value={content.about.companyInfo.customers}
                  onChange={(e) => updateNested("about", "companyInfo", "customers", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "contact" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">İletişim Bilgileri</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="space-y-2 text-sm text-gray-700">
                <span>E-posta</span>
                <input
                  type="email"
                  value={content.contact.email}
                  onChange={(e) => updateSection("contact", "email", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Destek E-postası</span>
                <input
                  type="email"
                  value={content.contact.supportEmail}
                  onChange={(e) => updateSection("contact", "supportEmail", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Telefon 1</span>
                <input
                  type="text"
                  value={content.contact.phone}
                  onChange={(e) => updateSection("contact", "phone", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Telefon 2</span>
                <input
                  type="text"
                  value={content.contact.phone2}
                  onChange={(e) => updateSection("contact", "phone2", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700 md:col-span-2">
                <span>Adres</span>
                <textarea
                  rows={3}
                  value={content.contact.address}
                  onChange={(e) => updateSection("contact", "address", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Çalışma Saatleri</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Hafta İçi</span>
                <input
                  type="text"
                  value={content.contact.workingHours.weekdays}
                  onChange={(e) => updateNested("contact", "workingHours", "weekdays", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Cumartesi</span>
                <input
                  type="text"
                  value={content.contact.workingHours.saturday}
                  onChange={(e) => updateNested("contact", "workingHours", "saturday", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Pazar</span>
                <input
                  type="text"
                  value={content.contact.workingHours.sunday}
                  onChange={(e) => updateNested("contact", "workingHours", "sunday", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "faq" && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Sıkça Sorulan Sorular</h2>
            <Button onClick={addFaq} variant="secondary">SSS Ekle</Button>
          </div>
          <div className="space-y-4">
            {content.faq.length === 0 && <p className="text-sm text-gray-500">Henüz SSS eklenmemiş.</p>}
            {content.faq.map((item, index) => (
              <Card key={index} className="border border-gray-200 p-4">
                <div className="mb-2 flex items-start justify-between">
                  <span className="text-sm font-semibold text-gray-700">Soru #{index + 1}</span>
                  <button className="text-xs text-red-600" onClick={() => removeFaq(index)}>Sil</button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={item.question}
                    onChange={(e) => updateFaq(index, "question", e.target.value)}
                    className="input-modern"
                    placeholder="Soru"
                  />
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(e) => updateFaq(index, "answer", e.target.value)}
                    className="input-modern"
                    placeholder="Yanıt"
                  />
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}

      {activeTab === "legal" && (
        <div className="space-y-6">
          {[
            { key: "privacyPolicy", label: "Gizlilik Politikası" },
            { key: "termsOfUse", label: "Kullanım Şartları" },
            { key: "cookiePolicy", label: "Çerez Politikası" }
          ].map(({ key, label }) => (
            <Card key={key} className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
                  <p className="text-sm text-gray-500">
                    {content.legal[key].lastUpdated
                      ? `Son güncelleme: ${new Date(content.legal[key].lastUpdated).toLocaleDateString("tr-TR")}`
                      : "Henüz güncellenmedi"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-2 text-sm text-gray-700">
                  <span>Başlık</span>
                  <input
                    type="text"
                    value={content.legal[key].title}
                    onChange={(e) => updatePolicy(key, "title", e.target.value)}
                    className="input-modern"
                  />
                </label>
                <label className="space-y-2 text-sm text-gray-700">
                  <span>Özet</span>
                  <input
                    type="text"
                    value={content.legal[key].summary || ""}
                    onChange={(e) => updatePolicy(key, "summary", e.target.value)}
                    className="input-modern"
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm text-gray-700 block">
                <span>İçerik</span>
                <textarea
                  rows={14}
                  value={content.legal[key].content}
                  onChange={(e) => updatePolicy(key, "content", e.target.value)}
                  className="input-modern"
                  placeholder={`${label} metnini buraya yazın`}
                />
              </label>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "support" && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Müşteri Hizmetleri</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Başlık</span>
                <input
                  type="text"
                  value={content.support.customerService.title}
                  onChange={(e) => updateSupport("title", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Alt Başlık</span>
                <input
                  type="text"
                  value={content.support.customerService.subtitle}
                  onChange={(e) => updateSupport("subtitle", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm text-gray-700 block">
              <span>Açıklama</span>
              <textarea
                rows={4}
                value={content.support.customerService.description}
                onChange={(e) => updateSupport("description", e.target.value)}
                className="input-modern"
              />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2 text-sm text-gray-700">
                <span>E-posta</span>
                <input
                  type="email"
                  value={content.support.customerService.email}
                  onChange={(e) => updateSupport("email", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Telefon</span>
                <input
                  type="text"
                  value={content.support.customerService.phone}
                  onChange={(e) => updateSupport("phone", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>WhatsApp</span>
                <input
                  type="text"
                  value={content.support.customerService.whatsapp || ""}
                  onChange={(e) => updateSupport("whatsapp", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Hafta içi</span>
                <input
                  type="text"
                  value={content.support.customerService.supportHours.weekdays}
                  onChange={(e) => updateSupportHours("weekdays", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Cumartesi</span>
                <input
                  type="text"
                  value={content.support.customerService.supportHours.saturday}
                  onChange={(e) => updateSupportHours("saturday", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Pazar</span>
                <input
                  type="text"
                  value={content.support.customerService.supportHours.sunday}
                  onChange={(e) => updateSupportHours("sunday", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Yanıt Süresi</span>
                <input
                  type="text"
                  value={content.support.customerService.responseTime || ""}
                  onChange={(e) => updateSupport("responseTime", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>SSS Yönlendirme Metni</span>
                <input
                  type="text"
                  value={content.support.customerService.faqHint || ""}
                  onChange={(e) => updateSupport("faqHint", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>
          </Card>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Ödeme Yöntemleri</h2>
                <p className="text-sm text-gray-500">Müşterilerinize sunduğunuz ödeme seçeneklerini güncelleyin.</p>
              </div>
              <Button variant="outline" onClick={addPaymentMethod}>
                Yeni Yöntem Ekle
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-2 text-sm text-gray-700">
                <span>Başlık</span>
                <input
                  type="text"
                  value={content.support.paymentOptions.title}
                  onChange={(e) => updatePaymentOptions("title", e.target.value)}
                  className="input-modern"
                />
              </label>
              <label className="space-y-2 text-sm text-gray-700">
                <span>Alt Başlık</span>
                <input
                  type="text"
                  value={content.support.paymentOptions.subtitle}
                  onChange={(e) => updatePaymentOptions("subtitle", e.target.value)}
                  className="input-modern"
                />
              </label>
            </div>

            <label className="space-y-2 text-sm text-gray-700 block">
              <span>Güvenli Ödeme Metni</span>
              <textarea
                rows={3}
                value={content.support.paymentOptions.securePaymentText || ""}
                onChange={(e) => updatePaymentOptions("securePaymentText", e.target.value)}
                className="input-modern"
              />
            </label>

            <div className="space-y-4">
              {content.support.paymentOptions.methods.map((method, index) => (
                <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <h3 className="text-base font-semibold text-gray-900">
                      {method.name?.trim() || `Ödeme Yöntemi ${index + 1}`}
                    </h3>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-600">
                        <input
                          type="checkbox"
                          checked={method.enabled ?? true}
                          onChange={(e) => updatePaymentMethod(index, "enabled", e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        Aktif
                      </label>
                      <Button variant="ghost" onClick={() => removePaymentMethod(index)}>
                        Sil
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label className="space-y-2 text-sm text-gray-700">
                      <span>Başlık</span>
                      <input
                        type="text"
                        value={method.name}
                        onChange={(e) => updatePaymentMethod(index, "name", e.target.value)}
                        className="input-modern"
                      />
                    </label>
                    <label className="space-y-2 text-sm text-gray-700">
                      <span>Anahtar (isteğe bağlı)</span>
                      <input
                        type="text"
                        value={method.key || ""}
                        onChange={(e) => updatePaymentMethod(index, "key", e.target.value)}
                        className="input-modern"
                        placeholder="credit-card, bank-transfer..."
                      />
                    </label>
                  </div>

                  <label className="space-y-2 text-sm text-gray-700 block">
                    <span>Kısa Açıklama</span>
                    <textarea
                      rows={3}
                      value={method.description || ""}
                      onChange={(e) => updatePaymentMethod(index, "description", e.target.value)}
                      className="input-modern"
                    />
                  </label>

                  <label className="space-y-2 text-sm text-gray-700 block">
                    <span>Detaylar (opsiyonel)</span>
                    <textarea
                      rows={2}
                      value={method.details || ""}
                      onChange={(e) => updatePaymentMethod(index, "details", e.target.value)}
                      className="input-modern"
                    />
                  </label>
                </div>
              ))}

              {content.support.paymentOptions.methods.length === 0 && (
                <div className="rounded-md border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                  Henüz ödeme yöntemi eklenmemiş. İlk yöntemi eklemek için yukarıdaki butonu kullanın.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={loadContent} disabled={saving}>
          Yenile
        </Button>
        <Button onClick={handleSave} disabled={saving || !token}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </main>
  );
}