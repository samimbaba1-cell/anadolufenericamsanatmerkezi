"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import { apiFetch } from "../../../lib/api";
import { getPublicApiOriginForClient } from "../../../lib/api-base";

const MARKETPLACE_LABELS = {
  trendyol: "Trendyol",
  hepsiburada: "Hepsiburada",
  n11: "N11"
};

const MARKETPLACE_KEYS = Object.keys(MARKETPLACE_LABELS);

const STATUS_BADGES = {
  success: "bg-green-100 text-green-800",
  error: "bg-red-100 text-red-700"
};

function randomToken() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "");
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

function listToString(list) {
  return Array.isArray(list) ? list.join(", ") : "";
}

function safeParse(text) {
  try {
    const val = JSON.parse(text);
    return val && typeof val === "object" ? val : {};
  } catch {
    return {};
  }
}

const INITIAL_FEED_SETTINGS = {
  vat: "",
  currency: "TRY",
  deliveryDays: "",
  imageLimit: "",
  brandKeys: ""
};

const INITIAL_WEBHOOKS = {
  trendyol: "",
  hepsiburada: "",
  n11: ""
};

const INITIAL_INTEGRATIONS = {
  googleAnalyticsId: "",
  facebookPixelId: ""
};

const INITIAL_API_FORM = {
  trendyol: { supplierId: "", username: "", password: "", enabled: false, hasPassword: false },
  hepsiburada: { merchantId: "", username: "", password: "", enabled: false, hasPassword: false },
  n11: { appKey: "", appSecret: "", enabled: false, hasSecret: false }
};

const INITIAL_LOG_FILTERS = {
  marketplace: "all",
  status: "all",
  page: 1
};

export default function MarketplacesPage() {
  const { user, token: authToken, loading: authLoading } = useAuth();
  const { showToast } = useToast();

  const [feedToken, setFeedToken] = useState("");
  const [feedSettingsForm, setFeedSettingsForm] = useState(INITIAL_FEED_SETTINGS);
  const [webhookForm, setWebhookForm] = useState(INITIAL_WEBHOOKS);
  const [integrationForm, setIntegrationForm] = useState(INITIAL_INTEGRATIONS);
  const [apiForm, setApiForm] = useState(INITIAL_API_FORM);
  const [adminConfig, setAdminConfig] = useState(null);
  const [mappings, setMappings] = useState(null);
  const [feedInfo, setFeedInfo] = useState(null);

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingMappings, setSavingMappings] = useState(false);
  const [syncing, setSyncing] = useState({ trendyol: false, hepsiburada: false, n11: false });

  const [feedback, setFeedback] = useState({ type: null, message: "" });

  const [logFilters, setLogFilters] = useState(INITIAL_LOG_FILTERS);
  const [logs, setLogs] = useState([]);
  const [logStats, setLogStats] = useState({});
  const [logPagination, setLogPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [pushProviders, setPushProviders] = useState([]);

  const apiBase = useMemo(() => getPublicApiOriginForClient(), []);

  const marketplaceDisplayName = useCallback(
    (id) => {
      if (!id) return "";
      const key = String(id).toLowerCase();
      const fromApi = pushProviders.find((p) => String(p.id).toLowerCase() === key);
      return fromApi?.label || MARKETPLACE_LABELS[id] || MARKETPLACE_LABELS[key] || id;
    },
    [pushProviders]
  );

  useEffect(() => {
    if (!feedToken && typeof window !== "undefined") {
      const stored = localStorage.getItem("feed-token");
      if (stored) setFeedToken(stored);
    }
  }, [feedToken]);

  const loadAdminConfig = useCallback(async () => {
    if (!authToken) return;
    setLoadingConfig(true);
    setFeedback({ type: null, message: "" });

    try {
      const data = await apiFetch("/api/admin/marketplaces/config", { token: authToken });
      setAdminConfig(data);
      setFeedToken(data.feedToken || "");
      setFeedSettingsForm({
        vat: data.feedSettings?.vat ?? "",
        currency: data.feedSettings?.currency || "TRY",
        deliveryDays: data.feedSettings?.deliveryDays ?? "",
        imageLimit: data.feedSettings?.imageLimit ?? "",
        brandKeys: listToString(data.feedSettings?.brandKeys)
      });
      setWebhookForm({
        trendyol: data.webhookSecrets?.trendyol || "",
        hepsiburada: data.webhookSecrets?.hepsiburada || "",
        n11: data.webhookSecrets?.n11 || ""
      });
      setIntegrationForm({
        googleAnalyticsId: data.integrations?.googleAnalyticsId || "",
        facebookPixelId: data.integrations?.facebookPixelId || ""
      });
      setApiForm({
        trendyol: {
          supplierId: data.apiCredentials?.trendyol?.supplierId || "",
          username: data.apiCredentials?.trendyol?.username || "",
          password: "",
          enabled: Boolean(data.apiCredentials?.trendyol?.enabled),
          hasPassword: Boolean(data.apiCredentials?.trendyol?.hasPassword)
        },
        hepsiburada: {
          merchantId: data.apiCredentials?.hepsiburada?.merchantId || "",
          username: data.apiCredentials?.hepsiburada?.username || "",
          password: "",
          enabled: Boolean(data.apiCredentials?.hepsiburada?.enabled),
          hasPassword: Boolean(data.apiCredentials?.hepsiburada?.hasPassword)
        },
        n11: {
          appKey: data.apiCredentials?.n11?.appKey || "",
          appSecret: "",
          enabled: Boolean(data.apiCredentials?.n11?.enabled),
          hasSecret: Boolean(data.apiCredentials?.n11?.hasSecret)
        }
      });
      if (typeof window !== "undefined") {
        localStorage.setItem("feed-token", data.feedToken || "");
      }
      try {
        const prov = await apiFetch("/api/admin/marketplaces/providers", { token: authToken });
        setPushProviders(Array.isArray(prov.providers) ? prov.providers : []);
      } catch {
        setPushProviders([]);
      }
      setFeedback({ type: null, message: "" });
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Pazaryeri ayarları alınamadı" });
      setAdminConfig(null);
    } finally {
      setLoadingConfig(false);
    }
  }, [authToken]);

  const loadFeedInfo = useCallback(async () => {
    if (!feedToken) {
      setFeedInfo(null);
      setMappings(null);
      return;
    }
    try {
      const [feedRes, mappingRes] = await Promise.all([
        fetch(`${apiBase}/api/feeds/config?token=${encodeURIComponent(feedToken)}`),
        fetch(`${apiBase}/api/feeds/mappings?token=${encodeURIComponent(feedToken)}`)
      ]);

      if (feedRes.ok) {
        setFeedInfo(await feedRes.json());
      } else {
        setFeedInfo(null);
      }

      if (mappingRes.ok) {
        setMappings(await mappingRes.json());
      } else {
        setMappings(null);
      }
    } catch (error) {
      console.error("Feed info load error", error);
      setFeedInfo(null);
      setMappings(null);
    }
  }, [apiBase, feedToken]);

  const loadLogs = useCallback(async () => {
    if (!authToken) return;
    setLoadingLogs(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(logFilters.page));
      params.set("limit", String(logPagination.limit || 20));
      if (logFilters.marketplace !== "all") params.set("marketplace", logFilters.marketplace);
      if (logFilters.status !== "all") params.set("status", logFilters.status);

      const data = await apiFetch(`/api/admin/marketplaces/logs?${params.toString()}`, { token: authToken });
      setLogs(data.logs || []);
      setLogStats(data.stats || {});
      setLogPagination((prev) => ({
        ...prev,
        page: data.pagination?.page || logFilters.page,
        pages: data.pagination?.pages || prev.pages,
        total: data.pagination?.total || prev.total,
        limit: data.pagination?.limit || prev.limit
      }));
    } catch (error) {
      console.error("Marketplace logs load error", error);
      showToast(error.message || "Loglar yüklenirken hata oluştu", "error");
    } finally {
      setLoadingLogs(false);
    }
  }, [authToken, logFilters.page, logFilters.marketplace, logFilters.status, logPagination.limit, showToast]);

  useEffect(() => {
    if (!authLoading) {
      loadAdminConfig();
    }
  }, [authLoading, loadAdminConfig]);

  useEffect(() => {
    loadFeedInfo();
  }, [loadFeedInfo]);

  useEffect(() => {
    if (!authLoading) {
      loadLogs();
    }
  }, [authLoading, loadLogs]);

  const trendyolUrl = useMemo(() => {
    if (!feedToken) return `${apiBase}/api/feeds/trendyol.xml`;
    return `${apiBase}/api/feeds/trendyol.xml?token=${encodeURIComponent(feedToken)}`;
  }, [apiBase, feedToken]);

  const hepsiburadaUrl = useMemo(() => {
    if (!feedToken) return `${apiBase}/api/feeds/hepsiburada.xml`;
    return `${apiBase}/api/feeds/hepsiburada.xml?token=${encodeURIComponent(feedToken)}`;
  }, [apiBase, feedToken]);

  const n11Url = useMemo(() => {
    if (!feedToken) return `${apiBase}/api/feeds/n11.xml`;
    return `${apiBase}/api/feeds/n11.xml?token=${encodeURIComponent(feedToken)}`;
  }, [apiBase, feedToken]);

  const handleCopy = async (value, successMessage = "Kopyalandı") => {
    try {
      await navigator.clipboard.writeText(value || "");
      showToast(successMessage, "success");
    } catch (error) {
      showToast("Kopyalama başarısız", "error");
    }
  };

  const handleSaveConfig = async () => {
    if (!authToken) return;
    setSavingConfig(true);
    setFeedback({ type: null, message: "" });
    try {
      const payload = {
        feedToken: feedToken || "",
        feedSettings: {
          vat: feedSettingsForm.vat === "" ? null : Number(feedSettingsForm.vat),
          currency: feedSettingsForm.currency,
          deliveryDays: feedSettingsForm.deliveryDays === "" ? null : Number(feedSettingsForm.deliveryDays),
          imageLimit: feedSettingsForm.imageLimit === "" ? null : Number(feedSettingsForm.imageLimit),
          brandKeys: feedSettingsForm.brandKeys
            ? feedSettingsForm.brandKeys.split(",").map((k) => k.trim()).filter(Boolean)
            : []
        },
        webhookSecrets: webhookForm,
        integrations: integrationForm,
        apiCredentials: {
          trendyol: {
            supplierId: apiForm.trendyol.supplierId,
            username: apiForm.trendyol.username,
            enabled: apiForm.trendyol.enabled,
            ...(apiForm.trendyol.password ? { password: apiForm.trendyol.password } : {})
          },
          hepsiburada: {
            merchantId: apiForm.hepsiburada.merchantId,
            username: apiForm.hepsiburada.username,
            enabled: apiForm.hepsiburada.enabled,
            ...(apiForm.hepsiburada.password ? { password: apiForm.hepsiburada.password } : {})
          },
          n11: {
            appKey: apiForm.n11.appKey,
            enabled: apiForm.n11.enabled,
            ...(apiForm.n11.appSecret ? { appSecret: apiForm.n11.appSecret } : {})
          }
        }
      };

      const updated = await apiFetch("/api/admin/marketplaces/config", {
        method: "PUT",
        token: authToken,
        body: payload
      });

      setAdminConfig(updated);
      setFeedback({ type: "success", message: "Ayarlar kaydedildi." });
      setApiForm((prev) => ({
        trendyol: {
          supplierId: updated.apiCredentials?.trendyol?.supplierId || prev.trendyol.supplierId,
          username: updated.apiCredentials?.trendyol?.username || prev.trendyol.username,
          password: "",
          enabled: Boolean(updated.apiCredentials?.trendyol?.enabled),
          hasPassword: Boolean(updated.apiCredentials?.trendyol?.hasPassword)
        },
        hepsiburada: {
          merchantId: updated.apiCredentials?.hepsiburada?.merchantId || prev.hepsiburada.merchantId,
          username: updated.apiCredentials?.hepsiburada?.username || prev.hepsiburada.username,
          password: "",
          enabled: Boolean(updated.apiCredentials?.hepsiburada?.enabled),
          hasPassword: Boolean(updated.apiCredentials?.hepsiburada?.hasPassword)
        },
        n11: {
          appKey: updated.apiCredentials?.n11?.appKey || prev.n11.appKey,
          appSecret: "",
          enabled: Boolean(updated.apiCredentials?.n11?.enabled),
          hasSecret: Boolean(updated.apiCredentials?.n11?.hasSecret)
        }
      }));
      if (typeof window !== "undefined") {
        localStorage.setItem("feed-token", updated.feedToken || "");
      }
      await loadFeedInfo();
    } catch (error) {
      setFeedback({ type: "error", message: error.message || "Ayarlar kaydedilemedi" });
    } finally {
      setSavingConfig(false);
    }
  };

  const handleMappingSave = async () => {
    if (!feedToken) {
      setFeedback({ type: "error", message: "Önce feed token belirleyin." });
      return;
    }
    setSavingMappings(true);
    try {
      await fetch(`${apiBase}/api/feeds/mappings?token=${encodeURIComponent(feedToken)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mappings || {})
      });
      setFeedback({ type: "success", message: "Eşleştirmeler güncellendi." });
      await loadFeedInfo();
    } catch (error) {
      setFeedback({ type: "error", message: `Eşleştirmeler kaydedilemedi: ${error.message || ""}` });
    } finally {
      setSavingMappings(false);
    }
  };

  const handlePush = async (marketplace) => {
    if (!authToken) return;
    setSyncing((prev) => ({ ...prev, [marketplace]: true }));
    try {
      const result = await apiFetch(`/api/admin/marketplaces/${marketplace}/push`, {
        method: "POST",
        token: authToken,
        body: {}
      });
      showToast(
        `${marketplaceDisplayName(marketplace)} aktarımı tamamlandı (${result.requestCount || 0} istek, ${result.productCount || 0} ürün)`,
        "success"
      );
      setFeedback({ type: "success", message: `${marketplaceDisplayName(marketplace)} aktarımı başarılı.` });
      await loadLogs();
    } catch (error) {
      showToast(error.message || "Aktarım başarısız", "error");
      setFeedback({ type: "error", message: error.message || `${marketplaceDisplayName(marketplace)} aktarımı başarısız.` });
      await loadLogs();
    } finally {
      setSyncing((prev) => ({ ...prev, [marketplace]: false }));
    }
  };

  const handleLogFilterChange = (key, value) => {
    setLogFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleLogPageChange = (page) => {
    setLogFilters((prev) => ({ ...prev, page }));
  };

  if (authLoading) {
    return <main className="max-w-6xl mx-auto p-6 text-center text-gray-500">Yükleniyor...</main>;
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
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">Pazaryeri Entegrasyonları</h1>
        <p className="text-gray-600">Feed token, webhook şifreleri, API anahtarları ve entegrasyon loglarını buradan yönetin.</p>
      </div>

      <Card className="p-6 space-y-3 border border-slate-200 bg-slate-50/90 text-sm text-slate-700">
        <h2 className="text-base font-semibold text-slate-900">Nasıl çalışır? (tüm pazaryerleri için ortak mantık)</h2>
        <p>
          Gerçek dünyada tek bir XML veya tek bir API tüm pazaryerlerinde birebir aynı değildir; her platformun kategori ağacı, zorunlu alanlar ve kimlik doğrulama yöntemi farklıdır.
          Bu yüzden burada iki katman vardır: <strong>feed (URL ile XML)</strong> ve <strong>doğrudan API push</strong>.
        </p>
        <p>
          <strong>Feed</strong> ortak ürün verisinden üç ayrı şema (Trendyol, Hepsiburada, N11) üretir; pazaryeri panelinde ürünleri URL üzerinden çekme seçeneği varsa ilgili linki yapıştırırsınız.
          Başka bir pazaryeri için de aynı yöntem ancak o platformun kabul ettiği şemaya uygun yeni bir feed veya dönüştürücü ile mümkündür; backend tarafına adapter veya route eklendiğinde aşağıdaki kayıtlı adaptör listesi güncellenir.
        </p>
        <p>
          <strong>API push</strong> şu an kayıtlı adaptörlerle yapılır; her kutu için partner panelinden alınan bilgileri girersiniz.
          Ürün görselleri veritabanında göreli yol olarak duruyorsa, backend ortamında <code className="rounded bg-white px-1 py-0.5 text-xs">FRONTEND_URL</code> veya{" "}
          <code className="rounded bg-white px-1 py-0.5 text-xs">NEXT_PUBLIC_SITE_URL</code> tanımlı olmalıdır; böylece pazaryerine tam HTTPS görsel adresi gider.
        </p>
        <p className="text-xs text-slate-600">
          Bu sayfadaki feed ve test istekleri için kök adres: tarayıcıda açık olan site adresi kullanılır (LAN veya canlı domain); sadece{" "}
          <code className="rounded bg-white px-1">NEXT_PUBLIC_API_URL</code> doluysa o kök önceliklidir.
        </p>
      </Card>

      {feedback.type && (
        <Card className={`p-4 border ${feedback.type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {feedback.message}
        </Card>
      )}

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Feed Token</h2>
            <p className="text-sm text-gray-600">Token pazaryeri feed linklerinin korunması için kullanılır. Boş bırakırsanız feed herkese açık olur.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setFeedToken(randomToken())}>Token Oluştur</Button>
            <Button variant="secondary" onClick={() => handleCopy(feedToken, "Token kopyalandı")}>Kopyala</Button>
          </div>
        </div>
        <input
          type="text"
          className="input-modern w-full"
          value={feedToken}
          onChange={(e) => setFeedToken(e.target.value)}
          placeholder="ör. my-secret-token"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Varsayılan KDV (%)</span>
            <p className="text-xs text-gray-500 mt-0.5">Feed ve API gövdesinde ürün özel KDV yoksa kullanılan oran.</p>
            <input
              type="number"
              className="input-modern mt-1"
              value={feedSettingsForm.vat}
              onChange={(e) => setFeedSettingsForm((prev) => ({ ...prev, vat: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Para Birimi</span>
            <p className="text-xs text-gray-500 mt-0.5">ISO kodu (çoğunlukla TRY); fiyat alanlarında geçer.</p>
            <input
              type="text"
              className="input-modern mt-1"
              value={feedSettingsForm.currency}
              onChange={(e) => setFeedSettingsForm((prev) => ({ ...prev, currency: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Teslimat Süresi (gün)</span>
            <p className="text-xs text-gray-500 mt-0.5">Kargo hazırlık süresi; pazaryeri şablonlarında kullanılır.</p>
            <input
              type="number"
              className="input-modern mt-1"
              value={feedSettingsForm.deliveryDays}
              onChange={(e) => setFeedSettingsForm((prev) => ({ ...prev, deliveryDays: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Görsel Limiti</span>
            <p className="text-xs text-gray-500 mt-0.5">Ürün başına XML ve push içinde en fazla kaç görsel.</p>
            <input
              type="number"
              className="input-modern mt-1"
              value={feedSettingsForm.imageLimit}
              onChange={(e) => setFeedSettingsForm((prev) => ({ ...prev, imageLimit: e.target.value }))}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-gray-700">Marka Anahtarları (virgülle ayırın)</span>
          <p className="text-xs text-gray-500 mt-0.5">Ürün özelliklerinde marka metnini hangi alan adlarıyla eşleyeceğimizi belirler (ör. marka, brand).</p>
          <input
            type="text"
            className="input-modern mt-1"
            value={feedSettingsForm.brandKeys}
            onChange={(e) => setFeedSettingsForm((prev) => ({ ...prev, brandKeys: e.target.value }))}
          />
        </label>

        <div className="flex md:justify-end">
          <Button onClick={handleSaveConfig} disabled={savingConfig || loadingConfig}>
            {savingConfig ? "Kaydediliyor..." : "Ayarları Kaydet"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Webhook Güvenlik Anahtarları</h2>
        <p className="text-sm text-gray-600">
          Pazaryerlerinden gelen sipariş bildirimlerini doğrulamak için bu anahtarları kullanın. Pazaryeri paneline aynı anahtarı girmeyi unutmayın.
        </p>
        <p className="text-xs text-gray-500">
          Her kutu ilgili pazaryerinin webhook veya bildirim ayarlarındaki gizli imza alanına yazılır; burada ve panelde birebir aynı olmalıdır.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          {MARKETPLACE_KEYS.map((key) => (
            <label key={key} className="block">
              <span className="text-sm font-medium text-gray-700">{MARKETPLACE_LABELS[key]}</span>
              <p className="text-xs text-gray-500 mt-0.5">Bu kanal için paylaşılan gizli dize.</p>
              <input
                type="text"
                className="input-modern mt-1"
                value={webhookForm[key] || ""}
                onChange={(e) => setWebhookForm((prev) => ({ ...prev, [key]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold">API Entegrasyonları</h2>
          <p className="text-sm text-gray-600">Trendyol, Hepsiburada ve N11 API anahtarlarınızı girerek ürün push işlemlerini etkinleştirin.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Trendyol</h3>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={apiForm.trendyol.enabled}
                  onChange={(e) => setApiForm((prev) => ({ ...prev, trendyol: { ...prev.trendyol, enabled: e.target.checked } }))}
                />
                Aktif
              </label>
            </div>
            <input
              className="input-modern"
              placeholder="Supplier ID"
              value={apiForm.trendyol.supplierId}
              onChange={(e) => setApiForm((prev) => ({ ...prev, trendyol: { ...prev.trendyol, supplierId: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">Trendyol satıcı panelindeki tedarikçi numarası (supplier id).</p>
            <input
              className="input-modern"
              placeholder="Kullanıcı Adı"
              value={apiForm.trendyol.username}
              onChange={(e) => setApiForm((prev) => ({ ...prev, trendyol: { ...prev.trendyol, username: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">Entegrasyon için verilen API kullanıcı adı.</p>
            <input
              className="input-modern"
              type="password"
              placeholder={apiForm.trendyol.hasPassword ? "Şifre tanımlı (değiştirmek için girin)" : "Şifre"}
              value={apiForm.trendyol.password}
              onChange={(e) => setApiForm((prev) => ({ ...prev, trendyol: { ...prev.trendyol, password: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">API şifresi; kayıt sonrası şifrelenerek saklanır.</p>
            <Button
              onClick={() => handlePush("trendyol")}
              disabled={!apiForm.trendyol.enabled || syncing.trendyol}
              className="w-full"
            >
              {syncing.trendyol ? "Aktarılıyor..." : "Ürünleri Trendyol'a Gönder"}
            </Button>
            <MarketplaceStat
              stats={logStats.trendyol}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Hepsiburada</h3>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={apiForm.hepsiburada.enabled}
                  onChange={(e) => setApiForm((prev) => ({ ...prev, hepsiburada: { ...prev.hepsiburada, enabled: e.target.checked } }))}
                />
                Aktif
              </label>
            </div>
            <input
              className="input-modern"
              placeholder="Merchant ID"
              value={apiForm.hepsiburada.merchantId}
              onChange={(e) => setApiForm((prev) => ({ ...prev, hepsiburada: { ...prev.hepsiburada, merchantId: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">Hepsiburada satıcı (merchant) kimliği.</p>
            <input
              className="input-modern"
              placeholder="Kullanıcı Adı"
              value={apiForm.hepsiburada.username}
              onChange={(e) => setApiForm((prev) => ({ ...prev, hepsiburada: { ...prev.hepsiburada, username: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">OMS / entegrasyon kullanıcı adı.</p>
            <input
              className="input-modern"
              type="password"
              placeholder={apiForm.hepsiburada.hasPassword ? "Şifre tanımlı" : "Şifre"}
              value={apiForm.hepsiburada.password}
              onChange={(e) => setApiForm((prev) => ({ ...prev, hepsiburada: { ...prev.hepsiburada, password: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">Entegrasyon şifresi.</p>
            <Button
              onClick={() => handlePush("hepsiburada")}
              disabled={!apiForm.hepsiburada.enabled || syncing.hepsiburada}
              className="w-full"
            >
              {syncing.hepsiburada ? "Aktarılıyor..." : "Hepsiburada'ya Gönder"}
            </Button>
            <p className="text-xs text-gray-500">Ürün markası ve kategorisi için eşleştirmelerin tanımlı olduğundan emin olun.</p>
            <MarketplaceStat
              stats={logStats.hepsiburada}
            />
          </div>

          <div className="space-y-3 rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">N11</h3>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input
                  type="checkbox"
                  checked={apiForm.n11.enabled}
                  onChange={(e) => setApiForm((prev) => ({ ...prev, n11: { ...prev.n11, enabled: e.target.checked } }))}
                />
                Aktif
              </label>
            </div>
            <input
              className="input-modern"
              placeholder="App Key"
              value={apiForm.n11.appKey}
              onChange={(e) => setApiForm((prev) => ({ ...prev, n11: { ...prev.n11, appKey: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">N11 API anahtarı (appKey).</p>
            <input
              className="input-modern"
              type="password"
              placeholder={apiForm.n11.hasSecret ? "App Secret tanımlı" : "App Secret"}
              value={apiForm.n11.appSecret}
              onChange={(e) => setApiForm((prev) => ({ ...prev, n11: { ...prev.n11, appSecret: e.target.value } }))}
            />
            <p className="text-xs text-gray-500 -mt-1">N11 gizli anahtar (appSecret).</p>
            <Button
              onClick={() => handlePush("n11")}
              disabled={!apiForm.n11.enabled || syncing.n11}
              className="w-full"
            >
              {syncing.n11 ? "Aktarılıyor..." : "N11'e Gönder"}
            </Button>
            <p className="text-xs text-gray-500">N11 SOAP servisinde ürünler tek tek gönderilir. Kategori eşleştirmelerini kontrol edin.</p>
            <MarketplaceStat
              stats={logStats.n11}
            />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
          <h3 className="text-sm font-semibold text-gray-800">Kayıtlı push adaptörleri</h3>
          <p className="mt-1 text-xs text-gray-600">
            Backend&apos;de kayıtlı kanallar. Yeni pazaryeri için adapter ekleyince burada otomatik listelenir.
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {(pushProviders.length
              ? pushProviders
              : MARKETPLACE_KEYS.map((id) => ({ id, label: MARKETPLACE_LABELS[id] }))
            ).map((p) => (
              <li key={p.id} className="rounded-full bg-white px-3 py-1 text-xs text-gray-700 shadow-sm">
                {p.label || p.id}
              </li>
            ))}
          </ul>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Analytics / İzleme Kodları</h2>
        <p className="text-sm text-gray-600">Google Analytics veya Facebook Pixel gibi kodları buradan saklayın.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Google Analytics ID</span>
            <p className="text-xs text-gray-500 mt-0.5">Ölçüm kimliği (ör. G-XXXX); vitrinde GA bileşeni bu değeri okur.</p>
            <input
              type="text"
              className="input-modern mt-1"
              value={integrationForm.googleAnalyticsId}
              onChange={(e) => setIntegrationForm((prev) => ({ ...prev, googleAnalyticsId: e.target.value }))}
              placeholder="G-XXXXXXXX"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Facebook Pixel ID</span>
            <p className="text-xs text-gray-500 mt-0.5">Meta reklam panelindeki piksel kimliği.</p>
            <input
              type="text"
              className="input-modern mt-1"
              value={integrationForm.facebookPixelId}
              onChange={(e) => setIntegrationForm((prev) => ({ ...prev, facebookPixelId: e.target.value }))}
              placeholder="1234567890"
            />
          </label>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Feed Konfigürasyonu (Canlı)</h2>
        {feedInfo ? (
          <div className="grid grid-cols-1 gap-3 text-sm text-gray-700 sm:grid-cols-2">
            <div><span className="font-medium">Varsayılan KDV:</span> {feedInfo.vatDefault}%</div>
            <div><span className="font-medium">Para Birimi:</span> {feedInfo.currency}</div>
            <div><span className="font-medium">Teslimat (gün):</span> {feedInfo.deliveryDays}</div>
            <div><span className="font-medium">Görsel Limiti:</span> {feedInfo.imageLimit}</div>
            <div className="sm:col-span-2"><span className="font-medium">Marka Anahtarları:</span> {(feedInfo.brandKeys || []).join(", ")}</div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Feed yapılandırması alınamadı. Token doğru mu ve backend çalışıyor mu kontrol edin.</p>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Eşleştirme (Marka / Kategori)</h2>
        <p className="text-sm text-gray-600">Solda sizin değerleriniz, sağda pazaryeri ID/değeri. Boş bırakılanlar feed&apos;de isim olarak geçer.</p>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MappingTextarea
            title="Trendyol Marka"
            value={JSON.stringify(mappings?.trendyol?.brandMap || {}, null, 2)}
            onChange={(text) => setMappings((prev) => ({ ...(prev || {}), trendyol: { ...(prev?.trendyol || {}), brandMap: safeParse(text) } }))}
          />
          <MappingTextarea
            title="Trendyol Kategori"
            value={JSON.stringify(mappings?.trendyol?.categoryMap || {}, null, 2)}
            onChange={(text) => setMappings((prev) => ({ ...(prev || {}), trendyol: { ...(prev?.trendyol || {}), categoryMap: safeParse(text) } }))}
          />
          <MappingTextarea
            title="Hepsiburada Marka"
            value={JSON.stringify(mappings?.hepsiburada?.brandMap || {}, null, 2)}
            onChange={(text) => setMappings((prev) => ({ ...(prev || {}), hepsiburada: { ...(prev?.hepsiburada || {}), brandMap: safeParse(text) } }))}
          />
          <MappingTextarea
            title="Hepsiburada Kategori"
            value={JSON.stringify(mappings?.hepsiburada?.categoryMap || {}, null, 2)}
            onChange={(text) => setMappings((prev) => ({ ...(prev || {}), hepsiburada: { ...(prev?.hepsiburada || {}), categoryMap: safeParse(text) } }))}
          />
          <MappingTextarea
            title="N11 Marka"
            value={JSON.stringify(mappings?.n11?.brandMap || {}, null, 2)}
            onChange={(text) => setMappings((prev) => ({ ...(prev || {}), n11: { ...(prev?.n11 || {}), brandMap: safeParse(text) } }))}
          />
          <MappingTextarea
            title="N11 Kategori"
            value={JSON.stringify(mappings?.n11?.categoryMap || {}, null, 2)}
            onChange={(text) => setMappings((prev) => ({ ...(prev || {}), n11: { ...(prev?.n11 || {}), categoryMap: safeParse(text) } }))}
          />
        </div>
        <div className="flex gap-3">
          <Button disabled={savingMappings} onClick={handleMappingSave}>
            {savingMappings ? "Kaydediliyor..." : "Eşleştirmeleri Kaydet"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <FeedCard title="Trendyol Feed" url={trendyolUrl} onCopy={handleCopy} />
      </Card>

      <Card className="p-6 space-y-4">
        <FeedCard title="Hepsiburada Feed" url={hepsiburadaUrl} onCopy={handleCopy} />
      </Card>

      <Card className="p-6 space-y-4">
        <FeedCard title="N11 Feed" url={n11Url} onCopy={handleCopy} />
      </Card>

      <Card className="p-5 border-dashed border-slate-300 bg-white text-sm text-slate-700">
        <h3 className="font-semibold text-slate-900">Diğer pazaryerleri (Amazon, Çiçeksepeti, PTTAVM vb.)</h3>
        <p className="mt-2">
          Ortak olan şey ürün havuzunuzdur; her pazaryerinin kabul ettiği dosya veya API sözleşmesi farklıdır.
          Panel şu an üç büyük kanal için hazır XML üretir; başka bir kanal kendi şemasında URL ile içe aktarma sunuyorsa önce o dokümantasyona göre alanların uyup uymadığını kontrol edin.
          Uymuyorsa ya pazaryerinin resmi API entegrasyonuna özel adapter eklenmeli ya da harici bir feed dönüştürücü kullanılmalıdır.
        </p>
      </Card>

      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Entegrasyon Kayıtları</h2>
        <div className="flex flex-wrap gap-4">
          <select
            className="input-modern w-full max-w-xs"
            value={logFilters.marketplace}
            onChange={(e) => handleLogFilterChange("marketplace", e.target.value)}
          >
            <option value="all">Tüm Pazaryerleri</option>
            {MARKETPLACE_KEYS.map((key) => (
              <option key={key} value={key}>{marketplaceDisplayName(key)}</option>
            ))}
          </select>
          <select
            className="input-modern w-full max-w-xs"
            value={logFilters.status}
            onChange={(e) => handleLogFilterChange("status", e.target.value)}
          >
            <option value="all">Tüm Durumlar</option>
            <option value="success">Başarılı</option>
            <option value="error">Hata</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tarih</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Pazaryeri</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Durum</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Ürün</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Süre</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Mesaj</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Tetikleyen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loadingLogs ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">Yükleniyor...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">{new Date(log.createdAt).toLocaleString("tr-TR")}</td>
                    <td className="px-4 py-3 text-gray-700">{marketplaceDisplayName(log.marketplace) || log.marketplace}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${STATUS_BADGES[log.status] || "bg-gray-100 text-gray-700"}`}>
                        {log.status === "success" ? "Başarılı" : "Hata"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{log.productCount || 0}</td>
                    <td className="px-4 py-3 text-gray-700">{log.durationMs ? `${log.durationMs} ms` : "-"}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {log.errorMessage || log.responseSnippet || "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {log.triggeredBy?.name || log.triggeredBy?.email || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {logPagination.pages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
            <span>
              Toplam {logPagination.total} kayıt · Sayfa {logPagination.page}/{logPagination.pages}
            </span>
            <div className="flex gap-2">
              {Array.from({ length: logPagination.pages }).map((_, index) => {
                const pageNumber = index + 1;
                const active = pageNumber === logPagination.page;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handleLogPageChange(pageNumber)}
                    className={`rounded px-3 py-1 ${active ? "bg-gray-900 text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-100"}`}
                  >
                    {pageNumber}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-2">
        <h2 className="text-lg font-semibold">Notlar</h2>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>Feed&apos;ler yalnızca aktif ürünleri içerir.</li>
          <li>Stok, fiyat ve görseller ürün kayıtlarından alınır.</li>
          <li>Webhook doğrulaması için ilgili pazaryeri paneline aynı secret değerlerini girin.</li>
        </ul>
      </Card>
    </main>
  );
}

function FeedCard({ title, url, onCopy }) {
  return (
    <>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="space-y-2 break-all text-sm text-gray-700">
        <div>{url}</div>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => onCopy(url, `${title} linki kopyalandı`)}>Kopyala</Button>
          <Button variant="secondary" onClick={() => window.open(url, "_blank")}>Aç</Button>
        </div>
      </div>
    </>
  );
}

function MappingTextarea({ title, value, onChange }) {
  return (
    <div className="space-y-2">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <textarea
        className="input-modern h-32 w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function MarketplaceStat({ stats }) {
  if (!stats) {
    return null;
  }
  return (
    <div className="rounded border border-dashed border-gray-200 p-3 text-xs text-gray-600">
      <div>Başarılı: {stats.successCount || 0}</div>
      <div>Hata: {stats.errorCount || 0}</div>
      <div>Son Başarılı: {stats.lastSuccess ? new Date(stats.lastSuccess).toLocaleString("tr-TR") : "-"}</div>
      <div>Son Hata: {stats.lastError ? new Date(stats.lastError).toLocaleString("tr-TR") : "-"}</div>
    </div>
  );
}
