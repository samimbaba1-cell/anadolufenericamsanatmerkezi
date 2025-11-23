const express = require('express');
const User = require('../models/User');
const MarketplaceConfig = require('../models/MarketplaceConfig');
const MarketplacePushLog = require('../models/MarketplacePushLog');
const { auth } = require('../middleware/auth');
const { encrypt } = require('../utils/secretManager');
const marketplacePushService = require('../services/marketplacePushService');
const reportService = require('../services/reportService');
const analyticsService = require('../services/analyticsService');
const settingsService = require('../services/settingsService');
const dashboardService = require('../services/dashboardService');

const router = express.Router();

const CSV_BOM = '\ufeff';

function escapeCsvValue(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function rowsToCsv(rows = []) {
  return rows.map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

function buildSummaryCsv(data) {
  const summaryRows = [
    ['Metrik', 'Değer'],
    ['Toplam Gelir (₺)', (data.sales?.totalRevenue || 0).toFixed(2)],
    ['Toplam Sipariş', data.sales?.totalOrders || 0],
    ['Ortalama Sipariş (₺)', (data.sales?.averageOrderValue || 0).toFixed(2)],
    ['Büyüme (%)', (data.sales?.growth || 0).toFixed(2)],
    ['Önceki Gelir (₺)', (data.sales?.previousRevenue || 0).toFixed(2)],
    ['Aktif Müşteri', data.customers?.activeCustomers || 0],
    ['Yeni Müşteri', data.customers?.newCustomers || 0],
    ['Geri Dönen Müşteri', data.customers?.returningCustomers || 0]
  ];

  const timelineRows = [
    [],
    ['Tarih', 'Sipariş', 'Gelir (₺)'],
    ...(data.sales?.timeline || []).map((item) => [
      item.date,
      item.orders,
      (item.revenue || 0).toFixed(2)
    ])
  ];

  const marketplaceRows = [
    [],
    ['Pazaryeri', 'Sipariş', 'Gelir (₺)'],
    ...(data.sales?.marketplaces || []).map((item) => [
      item.source || 'website',
      item.orders || 0,
      (item.revenue || 0).toFixed(2)
    ])
  ];

  return [rowsToCsv(summaryRows), rowsToCsv(timelineRows), rowsToCsv(marketplaceRows)]
    .filter(Boolean)
    .join('\n');
}

function buildTopProductsCsv(data) {
  const rows = [
    ['Sıra', 'Ürün Adı', 'SKU', 'Satış (Adet)', 'Gelir (₺)'],
    ...(data.products?.topSelling || []).map((product, index) => [
      index + 1,
      product.name || '—',
      product.sku || '',
      product.sales || 0,
      (product.revenue || 0).toFixed(2)
    ])
  ];
  return rowsToCsv(rows);
}

function buildReportCsv(type, data) {
  if (type === 'top-products') {
    return buildTopProductsCsv(data);
  }
  return buildSummaryCsv(data);
}

// Admin middleware
const adminAuth = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin erişimi gerekli' });
    }
    req.admin = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// Apply auth and admin middleware to all routes
router.use(auth);
router.use(adminAuth);

// GET all users
router.get('/settings', async (req, res) => {
  try {
    const settings = await settingsService.getSettings({ includeSecrets: true });
    res.json(settings);
  } catch (error) {
    console.error('Admin settings fetch error:', error);
    res.status(500).json({ error: 'Ayarlar alınırken hata oluştu' });
  }
});

router.put('/settings', async (req, res) => {
  try {
    const updated = await settingsService.updateSettings(req.body || {}, req.admin._id);
    res.json(updated);
  } catch (error) {
    console.error('Admin settings update error:', error);
    res.status(500).json({ error: 'Ayarlar güncellenirken hata oluştu' });
  }
});

router.post('/settings/reset', async (req, res) => {
  try {
    const defaults = await settingsService.resetToDefaults(req.admin._id);
    res.json(defaults);
  } catch (error) {
    console.error('Admin settings reset error:', error);
    res.status(500).json({ error: 'Ayarlar sıfırlanırken hata oluştu' });
  }
});

router.post('/settings/branding/reset', async (req, res) => {
  try {
    const brandingDefaults = await settingsService.resetBranding(req.admin._id);
    res.json({
      general: brandingDefaults.general,
      theme: brandingDefaults.theme
    });
  } catch (error) {
    console.error('Admin branding reset error:', error);
    res.status(500).json({ error: 'Marka ayarları sıfırlanırken hata oluştu' });
  }
});

router.post('/settings/theme/reset', async (req, res) => {
  try {
    const themeDefaults = await settingsService.resetTheme(req.admin._id);
    res.json(themeDefaults.theme);
  } catch (error) {
    console.error('Admin theme reset error:', error);
    res.status(500).json({ error: 'Tema ayarları sıfırlanırken hata oluştu' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const overview = await dashboardService.getDashboardOverview({ range });
    res.json(overview);
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Dashboard verileri yüklenemedi' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = 'all',
      status = 'all'
    } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 10, 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);
    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role && role !== 'all') {
      query.role = role;
    }
    
    if (status && status !== 'all') {
      query.status = status;
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(numericLimit)
      .skip((numericPage - 1) * numericLimit);

    const total = await User.countDocuments(query);

    res.json({
      users,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET user by ID
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PUT update user role
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Geçersiz rol' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    user.role = role;
    await user.save();

    res.json({ message: 'Kullanıcı rolü güncellendi', user });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// PUT update user status
router.put('/users/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    user.status = status;
    user.isActive = status === 'active';
    user.bannedAt = status === 'banned' ? new Date() : null;
    await user.save();

    res.json({ message: 'Kullanıcı durumu güncellendi', user });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// DELETE user
router.delete('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }

    // Don't allow deleting own account
    if (user._id.toString() === req.user.userId) {
      return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Kullanıcı silindi' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// POST bulk user actions
router.post('/users/bulk', async (req, res) => {
  try {
    const { userIds, action } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ error: 'Kullanıcı ID listesi gerekli' });
    }

    let updateData = {};
    
    switch (action) {
      case 'activate':
        updateData = { status: 'active', isActive: true, bannedAt: null };
        break;
      case 'deactivate':
        updateData = { status: 'inactive', isActive: false, bannedAt: null };
        break;
      case 'ban':
        updateData = { status: 'banned', isActive: false, bannedAt: new Date() };
        break;
      case 'delete':
        await User.deleteMany({ _id: { $in: userIds } });
        return res.json({ message: `${userIds.length} kullanıcı silindi` });
      default:
        return res.status(400).json({ error: 'Geçersiz işlem' });
    }

    const result = await User.updateMany(
      { _id: { $in: userIds } },
      updateData
    );

    res.json({
      message: `${result.modifiedCount} kullanıcı güncellendi`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

// GET dashboard stats
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const adminUsers = await User.countDocuments({ role: 'admin' });
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) }
    });

    res.json({
      totalUsers,
      activeUsers,
      adminUsers,
      newUsersThisMonth,
      inactiveUsers: totalUsers - activeUsers
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

module.exports = router;

function buildMarketplaceConfigResponse(doc) {
  const raw = doc ? (doc.toObject ? doc.toObject() : doc) : null;
  const envDefaults = {
    vat: Number(process.env.FEED_VAT_DEFAULT || 20),
    currency: process.env.FEED_CURRENCY || 'TRY',
    deliveryDays: Number(process.env.FEED_DELIVERY_DAYS || 3),
    imageLimit: Number(process.env.FEED_IMAGE_LIMIT || 10),
    brandKeys: (process.env.FEED_BRAND_KEYS || 'brand,marka')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean)
  };

  const feedSettings = raw?.feedSettings || {};

  return {
    feedToken: (raw && raw.feedToken) || process.env.FEED_TOKEN || '',
    feedSettings: {
      vat: feedSettings.vat ?? envDefaults.vat,
      currency: feedSettings.currency || envDefaults.currency,
      deliveryDays: feedSettings.deliveryDays ?? envDefaults.deliveryDays,
      imageLimit: feedSettings.imageLimit ?? envDefaults.imageLimit,
      brandKeys: Array.isArray(feedSettings.brandKeys) && feedSettings.brandKeys.length
        ? feedSettings.brandKeys
        : envDefaults.brandKeys
    },
    webhookSecrets: {
      trendyol: raw?.webhookSecrets?.trendyol || '',
      hepsiburada: raw?.webhookSecrets?.hepsiburada || '',
      n11: raw?.webhookSecrets?.n11 || ''
    },
    integrations: raw?.integrations || {},
    apiCredentials: {
      trendyol: {
        supplierId: raw?.apiCredentials?.trendyol?.supplierId || '',
        username: raw?.apiCredentials?.trendyol?.username || '',
        enabled: Boolean(raw?.apiCredentials?.trendyol?.enabled),
        hasPassword: Boolean(raw?.apiCredentials?.trendyol?.password)
      },
      hepsiburada: {
        merchantId: raw?.apiCredentials?.hepsiburada?.merchantId || '',
        username: raw?.apiCredentials?.hepsiburada?.username || '',
        enabled: Boolean(raw?.apiCredentials?.hepsiburada?.enabled),
        hasPassword: Boolean(raw?.apiCredentials?.hepsiburada?.password)
      },
      n11: {
        appKey: raw?.apiCredentials?.n11?.appKey || '',
        enabled: Boolean(raw?.apiCredentials?.n11?.enabled),
        hasSecret: Boolean(raw?.apiCredentials?.n11?.appSecret)
      }
    }
  };
}

router.get('/marketplaces/config', async (req, res) => {
  try {
    const config = await MarketplaceConfig.findOne();
    res.json(buildMarketplaceConfigResponse(config));
  } catch (error) {
    console.error('Marketplace config get error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.put('/marketplaces/config', async (req, res) => {
  try {
    const { feedToken, feedSettings, webhookSecrets, integrations, apiCredentials } = req.body || {};

    const update = {};
    if (feedToken !== undefined) update.feedToken = feedToken || null;
    if (feedSettings && typeof feedSettings === 'object') {
      update.feedSettings = {
        vat: feedSettings.vat,
        currency: feedSettings.currency,
        deliveryDays: feedSettings.deliveryDays,
        imageLimit: feedSettings.imageLimit,
        brandKeys: feedSettings.brandKeys
      };
    }
    if (webhookSecrets && typeof webhookSecrets === 'object') {
      update.webhookSecrets = {
        trendyol: webhookSecrets.trendyol,
        hepsiburada: webhookSecrets.hepsiburada,
        n11: webhookSecrets.n11
      };
    }
    if (integrations && typeof integrations === 'object') {
      update.integrations = integrations;
    }
    if (apiCredentials && typeof apiCredentials === 'object') {
      const existing = await MarketplaceConfig.findOne();
      const current = existing?.apiCredentials || {};
      update.apiCredentials = {
        trendyol: {
          supplierId: apiCredentials.trendyol?.supplierId ?? current?.trendyol?.supplierId ?? '',
          username: apiCredentials.trendyol?.username ?? current?.trendyol?.username ?? '',
          password: apiCredentials.trendyol && Object.prototype.hasOwnProperty.call(apiCredentials.trendyol, 'password')
            ? (apiCredentials.trendyol.password ? encrypt(apiCredentials.trendyol.password) : null)
            : current?.trendyol?.password || null,
          enabled: typeof apiCredentials.trendyol?.enabled === 'boolean'
            ? apiCredentials.trendyol.enabled
            : Boolean(current?.trendyol?.enabled)
        },
        hepsiburada: {
          merchantId: apiCredentials.hepsiburada?.merchantId ?? current?.hepsiburada?.merchantId ?? '',
          username: apiCredentials.hepsiburada?.username ?? current?.hepsiburada?.username ?? '',
          password: apiCredentials.hepsiburada && Object.prototype.hasOwnProperty.call(apiCredentials.hepsiburada, 'password')
            ? (apiCredentials.hepsiburada.password ? encrypt(apiCredentials.hepsiburada.password) : null)
            : current?.hepsiburada?.password || null,
          enabled: typeof apiCredentials.hepsiburada?.enabled === 'boolean'
            ? apiCredentials.hepsiburada.enabled
            : Boolean(current?.hepsiburada?.enabled)
        },
        n11: {
          appKey: apiCredentials.n11?.appKey ?? current?.n11?.appKey ?? '',
          appSecret: apiCredentials.n11 && Object.prototype.hasOwnProperty.call(apiCredentials.n11, 'appSecret')
            ? (apiCredentials.n11.appSecret ? encrypt(apiCredentials.n11.appSecret) : null)
            : current?.n11?.appSecret || null,
          enabled: typeof apiCredentials.n11?.enabled === 'boolean'
            ? apiCredentials.n11.enabled
            : Boolean(current?.n11?.enabled)
        }
      };
    }
    update.updatedBy = req.admin._id;

    const config = await MarketplaceConfig.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json(buildMarketplaceConfigResponse(config));
  } catch (error) {
    console.error('Marketplace config update error:', error);
    res.status(500).json({ error: 'Sunucu hatası' });
  }
});

router.post('/marketplaces/:marketplace/push', async (req, res) => {
  try {
    const { marketplace } = req.params;
    const { productIds } = req.body || {};
    const result = await marketplacePushService.pushProducts({
      marketplace,
      productIds,
      adminId: req.admin._id
    });
    res.json({
      message: 'Aktarım tamamlandı',
      ...result
    });
  } catch (error) {
    console.error('Marketplace push error:', error);
    res.status(400).json({ error: error.message || 'Pazaryeri aktarımı başarısız' });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const data = await reportService.getReports({ range });
    res.json(data);
  } catch (error) {
    console.error('Admin reports error:', error);
    res.status(500).json({ error: 'Raporlar oluşturulurken hata oluştu' });
  }
});

router.get('/reports/export', async (req, res) => {
  try {
    const { range = '30d', type = 'summary', format = 'csv' } = req.query;

    if (format !== 'csv') {
      return res.status(400).json({ error: 'Şu anda yalnızca CSV formatı destekleniyor' });
    }

    const data = await reportService.getReports({ range });
    const csvContent = buildReportCsv(type, data);
    const filename = `rapor-${type}-${range}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(`${CSV_BOM}${csvContent}`);
  } catch (error) {
    console.error('Admin report export error:', error);
    res.status(500).json({ error: 'Rapor dışa aktarılırken hata oluştu' });
  }
});

router.get('/analytics', async (req, res) => {
  try {
    const { range = '7d' } = req.query;
    const data = await analyticsService.getAnalytics({ range });
    res.json(data);
  } catch (error) {
    console.error('Analytics fetch error:', error);
    res.status(500).json({ error: 'Analitik veriler alınırken hata oluştu' });
  }
});

router.get('/marketplaces/logs', async (req, res) => {
  try {
    const {
      marketplace = 'all',
      status = 'all',
      page = 1,
      limit = 20
    } = req.query;

    const numericLimit = Math.min(parseInt(limit, 10) || 20, 100);
    const numericPage = Math.max(parseInt(page, 10) || 1, 1);

    const filter = {};
    if (marketplace && marketplace !== 'all') {
      filter.marketplace = marketplace;
    }
    if (status && status !== 'all') {
      filter.status = status;
    }

    const [logs, total, aggregated] = await Promise.all([
      MarketplacePushLog.find(filter)
        .populate('triggeredBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip((numericPage - 1) * numericLimit)
        .limit(numericLimit)
        .lean(),
      MarketplacePushLog.countDocuments(filter),
      MarketplacePushLog.aggregate([
        {
          $group: {
            _id: { marketplace: '$marketplace', status: '$status' },
            count: { $sum: 1 },
            lastCreatedAt: { $max: '$createdAt' }
          }
        }
      ])
    ]);

    const stats = {};
    aggregated.forEach((item) => {
      const { marketplace: groupMarketplace, status: groupStatus } = item._id || {};
      if (!groupMarketplace) return;
      if (!stats[groupMarketplace]) {
        stats[groupMarketplace] = {
          successCount: 0,
          errorCount: 0,
          lastSuccess: null,
          lastError: null
        };
      }
      if (groupStatus === 'success') {
        stats[groupMarketplace].successCount = item.count;
        stats[groupMarketplace].lastSuccess = item.lastCreatedAt;
      } else if (groupStatus === 'error') {
        stats[groupMarketplace].errorCount = item.count;
        stats[groupMarketplace].lastError = item.lastCreatedAt;
      }
    });

    res.json({
      logs,
      pagination: {
        page: numericPage,
        limit: numericLimit,
        total,
        pages: Math.ceil(total / numericLimit)
      },
      stats
    });
  } catch (error) {
    console.error('Marketplace logs error:', error);
    res.status(500).json({ error: 'Loglar alınırken hata oluştu' });
  }
});
