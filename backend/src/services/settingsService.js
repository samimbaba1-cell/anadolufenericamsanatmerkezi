const mongoose = require('mongoose');
const SiteSettings = require('../models/SiteSettings');
const { encrypt, decrypt } = require('../utils/secretManager');

let cache = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000;

const SENSITIVE_FIELDS = [
  'email.password',
  'payment.iyzicoApiKey',
  'payment.iyzicoSecretKey'
];

const DEFAULT_SETTINGS = {
  general: {
    siteName: 'Anadolu Feneri Cam Sanat Merkezi',
    siteDescription: 'Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat',
    siteSlogan: 'Kaliteli ürünler, güvenilir hizmet',
    logoUrl: '/images/logo-placeholder.png',
    faviconUrl: '/icons/icon-192.svg'
  },
  contact: {
    email: 'info@anadolufenericamsanatmerkezi.com',
    phone: '+90 (212) 555-0123',
    address: 'İstanbul, Türkiye',
    whatsapp: '',
    supportHours: 'Hafta içi 09:00 - 18:00'
  },
  social: {
    facebook: '',
    instagram: '',
    twitter: '',
    linkedin: '',
    youtube: ''
  },
  seo: {
    metaTitle: 'Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş',
    metaDescription: 'En kaliteli ürünleri uygun fiyatlarla bulun',
    keywords: 'e-ticaret, online alışveriş, kaliteli ürünler'
  },
  analytics: {
    googleAnalyticsId: '',
    googleAnalyticsEnabled: false,
    facebookPixelId: '',
    facebookPixelEnabled: false,
    tawkToId: '',
    customScriptsHead: '',
    customScriptsBody: ''
  },
  email: {
    enableSmtp: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    password: '',
    fromEmail: 'noreply@anadolufenericamsanatmerkezi.com',
    fromName: 'Anadolu Feneri Cam Sanat Merkezi'
  },
  payment: {
    enableIyzico: true,
    iyzicoApiKey: '',
    iyzicoSecretKey: '',
    iyzicoBaseUrl: 'https://sandbox-api.iyzipay.com',
    enableCashOnDelivery: true,
    enableBankTransfer: false,
    bankAccounts: []
  },
  shipping: {
    enableFreeShipping: true,
    freeShippingThreshold: 500,
    shippingCost: 25,
    shippingCompanies: ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo'],
    defaultShippingCompany: 'Aras Kargo',
    estimatedDeliveryDays: 3
  },
  notifications: {
    enableEmailNotifications: true,
    alertEmail: '',
    lowStockAlert: true,
    orderEmailsToAdmin: true
  },
  theme: {
    primaryColor: '#3B82F6',
    secondaryColor: '#8B5CF6',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    surfaceColor: '#F8FAFC',
    successColor: '#10B981',
    warningColor: '#F59E0B',
    errorColor: '#EF4444',
    foregroundColor: '#0F172A',
    borderColor: '#E2E8F0',
    buttonRadius: 8,
    activePreset: 'modern-blue',
    fontFamily: 'inter',
    headingFont: 'Inter',
    bodyFont: 'Inter',
    layout: {
      headerStyle: 'default',
      footerStyle: 'default',
      sidebarPosition: 'right',
      productGrid: '4-columns',
      cardStyle: 'default',
      buttonStyle: 'rounded',
      borderRadius: 'medium',
      shadow: 'medium'
    },
    layoutTokens: {
      headerHeight: '64px',
      footerHeight: '200px',
      maxWidth: '1280px',
      borderRadius: '8px',
      shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
    },
    animations: {
      enableAnimations: true,
      animationSpeed: 'normal',
      hoverEffects: true,
      pageTransitions: true,
      duration: '300ms',
      easing: 'ease-in-out'
    }
  }
};

function mergeDefaults(settings = {}) {
  return {
    general: { ...DEFAULT_SETTINGS.general, ...(settings.general || {}) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(settings.contact || {}) },
    social: { ...DEFAULT_SETTINGS.social, ...(settings.social || {}) },
    seo: { ...DEFAULT_SETTINGS.seo, ...(settings.seo || {}) },
    analytics: { ...DEFAULT_SETTINGS.analytics, ...(settings.analytics || {}) },
    email: { ...DEFAULT_SETTINGS.email, ...(settings.email || {}) },
    payment: { ...DEFAULT_SETTINGS.payment, ...(settings.payment || {}) },
    shipping: { ...DEFAULT_SETTINGS.shipping, ...(settings.shipping || {}) },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...(settings.notifications || {}) },
    theme: { ...DEFAULT_SETTINGS.theme, ...(settings.theme || {}) },
    updatedBy: settings.updatedBy || null,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
    _id: settings._id
  };
}

function normalizeShippingConfig(shipping = {}) {
  const companies = Array.isArray(shipping.shippingCompanies)
    ? shipping.shippingCompanies.map((c) => (c || '').toString().trim()).filter(Boolean)
    : [];

  const normalizedCompanies = companies.length > 0
    ? companies
    : [...DEFAULT_SETTINGS.shipping.shippingCompanies];

  const defaultCompany = normalizedCompanies.includes(shipping.defaultShippingCompany)
    ? shipping.defaultShippingCompany
    : normalizedCompanies[0];

  return {
    ...shipping,
    shippingCompanies: normalizedCompanies,
    defaultShippingCompany: defaultCompany || 'Standart Kargo'
  };
}

function normalizeBankAccounts(bankAccounts = []) {
  if (!Array.isArray(bankAccounts)) return [];

  return bankAccounts
    .map((account) => {
      if (!account) return null;
      const {
        _id,
        bankName,
        accountName,
        iban,
        branch = '',
        accountNumber = '',
        description = '',
        isActive = true
      } = account;

      const normalizedIban = (iban || '').replace(/\s+/g, '').toUpperCase();
      const normalizedBankName = (bankName || '').trim();
      const normalizedAccountName = (accountName || '').trim();

      if (!normalizedBankName || !normalizedAccountName || !normalizedIban) {
        return null;
      }

      const existingId = _id || account.id || account.tempId;
      const bankAccountId = existingId && mongoose.Types.ObjectId.isValid(existingId)
        ? existingId
        : new mongoose.Types.ObjectId();

      return {
        _id: bankAccountId,
        bankName: normalizedBankName,
        accountName: normalizedAccountName,
        iban: normalizedIban,
        branch: (branch || '').trim(),
        accountNumber: (accountNumber || '').trim(),
        description: (description || '').trim(),
        isActive: Boolean(isActive)
      };
    })
    .filter(Boolean);
}

function decryptSettings(settings) {
  if (!settings) return mergeDefaults();
  const merged = mergeDefaults(settings);

  if (merged.email.password) {
    merged.email.password = decrypt(merged.email.password);
  }
  if (merged.payment.iyzicoApiKey) {
    merged.payment.iyzicoApiKey = decrypt(merged.payment.iyzicoApiKey);
  }
  if (merged.payment.iyzicoSecretKey) {
    merged.payment.iyzicoSecretKey = decrypt(merged.payment.iyzicoSecretKey);
  }

  merged.shipping = normalizeShippingConfig(merged.shipping);
  merged.payment.bankAccounts = normalizeBankAccounts(merged.payment.bankAccounts);

  return merged;
}

function sanitizeForResponse(settings, options = {}) {
  const sanitized = { ...settings };
  if (!options.includeSecrets) {
    if (sanitized.email) {
      sanitized.email.password = sanitized.email.password ? '********' : '';
    }
    if (sanitized.payment) {
      sanitized.payment.iyzicoApiKey = sanitized.payment.iyzicoApiKey ? '********' : '';
      sanitized.payment.iyzicoSecretKey = sanitized.payment.iyzicoSecretKey ? '********' : '';
    }
  }
  return sanitized;
}

function replaceLegacyDomain(value) {
  if (typeof value !== 'string') return value;
  if (!value.includes('@cmticaret.com')) return value;
  return value.replace('@cmticaret.com', '@anadolufenericamsanatmerkezi.com');
}

async function applyLegacyMigrations(doc) {
  if (!doc) return doc;

  const updates = {};

  if (doc.general?.siteName && /cm ticaret/i.test(doc.general.siteName)) {
    updates['general.siteName'] = DEFAULT_SETTINGS.general.siteName;
  }
  if (doc.general?.siteSlogan && /CM Ticaret/i.test(doc.general.siteSlogan)) {
    updates['general.siteSlogan'] = DEFAULT_SETTINGS.general.siteSlogan;
  }
  if (doc.email?.fromName && /cm ticaret/i.test(doc.email.fromName)) {
    updates['email.fromName'] = DEFAULT_SETTINGS.email.fromName;
  }

  if (typeof doc.contact?.email === 'string' && doc.contact.email.includes('@cmticaret.com')) {
    updates['contact.email'] = replaceLegacyDomain(doc.contact.email);
  }
  if (typeof doc.contact?.supportEmail === 'string' && doc.contact.supportEmail.includes('@cmticaret.com')) {
    updates['contact.supportEmail'] = replaceLegacyDomain(doc.contact.supportEmail);
  }
  if (typeof doc.email?.fromEmail === 'string' && doc.email.fromEmail.includes('@cmticaret.com')) {
    updates['email.fromEmail'] = replaceLegacyDomain(doc.email.fromEmail);
  }
  if (typeof doc.notifications?.alertEmail === 'string' && doc.notifications.alertEmail.includes('@cmticaret.com')) {
    updates['notifications.alertEmail'] = replaceLegacyDomain(doc.notifications.alertEmail);
  }

  if (!Array.isArray(doc.shipping?.shippingCompanies) || doc.shipping.shippingCompanies.length === 0) {
    updates['shipping.shippingCompanies'] = DEFAULT_SETTINGS.shipping.shippingCompanies;
    updates['shipping.defaultShippingCompany'] = DEFAULT_SETTINGS.shipping.defaultShippingCompany;
  } else if (
    doc.shipping?.defaultShippingCompany &&
    !doc.shipping.shippingCompanies.includes(doc.shipping.defaultShippingCompany)
  ) {
    updates['shipping.defaultShippingCompany'] = doc.shipping.shippingCompanies[0];
  }

  if (!Array.isArray(doc.payment?.bankAccounts)) {
    updates['payment.bankAccounts'] = [];
  }

  if (Object.keys(updates).length === 0) {
    return doc;
  }

  return SiteSettings.findOneAndUpdate(
    {},
    { $set: updates },
    { new: true }
  );
}

async function loadSettings(force = false) {
  const now = Date.now();
  if (!force && cache && now - cacheTime < CACHE_TTL) {
    return cache;
  }

  let doc = await SiteSettings.getSingleton();
  if (!doc) {
    doc = await SiteSettings.create(DEFAULT_SETTINGS);
  }
  doc = await applyLegacyMigrations(doc);

  cache = decryptSettings(doc);
  cacheTime = now;
  return cache;
}

async function getSettings(options = {}) {
  const settings = await loadSettings(options.force);
  return options.includeSecrets ? settings : sanitizeForResponse(settings);
}

async function getPublicSettings() {
  const settings = await loadSettings();
  return {
    general: settings.general,
    contact: settings.contact,
    social: settings.social,
    seo: settings.seo,
    theme: settings.theme,
    analytics: {
      googleAnalyticsId: settings.analytics.googleAnalyticsId,
      googleAnalyticsEnabled: Boolean(settings.analytics.googleAnalyticsEnabled),
      facebookPixelId: settings.analytics.facebookPixelId,
      facebookPixelEnabled: Boolean(settings.analytics.facebookPixelEnabled),
      tawkToId: settings.analytics.tawkToId
    },
    shipping: {
      enableFreeShipping: settings.shipping.enableFreeShipping,
      freeShippingThreshold: settings.shipping.freeShippingThreshold,
      shippingCost: settings.shipping.shippingCost,
      shippingCompanies: settings.shipping.shippingCompanies,
      defaultShippingCompany: settings.shipping.defaultShippingCompany,
      estimatedDeliveryDays: settings.shipping.estimatedDeliveryDays
    },
    payment: {
      enableIyzico: settings.payment.enableIyzico,
      enableCashOnDelivery: settings.payment.enableCashOnDelivery,
      enableBankTransfer: settings.payment.enableBankTransfer,
      bankAccounts: settings.payment.bankAccounts
        .filter((account) => account.isActive !== false)
        .map((account) => ({
          _id: account._id,
          bankName: account.bankName,
          accountName: account.accountName,
          iban: account.iban,
          branch: account.branch,
          accountNumber: account.accountNumber,
          description: account.description
        }))
    },
    features: {
      enableFreeShipping: settings.shipping.enableFreeShipping,
      freeShippingThreshold: settings.shipping.freeShippingThreshold
    }
  };
}

function prepareForSave(data) {
  const payload = { ...data };

  if (payload.email && typeof payload.email.password === 'string') {
    payload.email.password = payload.email.password ? encrypt(payload.email.password) : '';
  }
  if (payload.payment && typeof payload.payment.iyzicoApiKey === 'string') {
    payload.payment.iyzicoApiKey = payload.payment.iyzicoApiKey ? encrypt(payload.payment.iyzicoApiKey) : '';
  }
  if (payload.payment && typeof payload.payment.iyzicoSecretKey === 'string') {
    payload.payment.iyzicoSecretKey = payload.payment.iyzicoSecretKey ? encrypt(payload.payment.iyzicoSecretKey) : '';
  }

  if (payload.shipping) {
    payload.shipping = normalizeShippingConfig(payload.shipping);
  }

  if (payload.payment) {
    if (Array.isArray(payload.payment.bankAccounts)) {
      payload.payment.bankAccounts = normalizeBankAccounts(payload.payment.bankAccounts);
    } else {
      payload.payment.bankAccounts = [];
    }
  }

  return payload;
}

async function updateSettings(input, adminId) {
  const existing = await loadSettings();
  const merged = mergeDefaults(existing);

  const next = {
    ...merged,
    ...input,
    email: { ...merged.email, ...(input.email || {}) },
    payment: { ...merged.payment, ...(input.payment || {}) },
    shipping: { ...merged.shipping, ...(input.shipping || {}) },
    analytics: { ...merged.analytics, ...(input.analytics || {}) },
    notifications: { ...merged.notifications, ...(input.notifications || {}) },
    contact: { ...merged.contact, ...(input.contact || {}) },
    general: { ...merged.general, ...(input.general || {}) },
    social: { ...merged.social, ...(input.social || {}) },
    seo: { ...merged.seo, ...(input.seo || {}) },
    theme: { ...merged.theme, ...(input.theme || {}) },
    updatedBy: adminId
  };

  next.shipping = normalizeShippingConfig(next.shipping);
  next.payment.bankAccounts = normalizeBankAccounts(next.payment.bankAccounts);

  const payload = prepareForSave(next);

  const updated = await SiteSettings.findOneAndUpdate({}, payload, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });

  cache = decryptSettings(updated);
  cacheTime = Date.now();
  return cache;
}

async function getEmailConfig() {
  const settings = await loadSettings();
  const email = { ...settings.email };

  if (!email.enableSmtp) {
    const envUser = process.env.SMTP_USER;
    const envPass = process.env.SMTP_PASS;
    if (envUser && envPass) {
      email.enableSmtp = true;
      email.host = process.env.SMTP_HOST || email.host;
      email.port = Number(process.env.SMTP_PORT || email.port);
      email.secure = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : email.secure;
      email.user = envUser;
      email.password = envPass;
      email.fromEmail = process.env.SMTP_FROM_EMAIL || email.fromEmail;
      email.fromName = process.env.SMTP_FROM_NAME || email.fromName;
    }
  }

  return email;
}

async function getPaymentConfig() {
  const settings = await loadSettings();
  const payment = { ...settings.payment };

  if (!payment.iyzicoApiKey) {
    if (process.env.IYZICO_API_KEY && process.env.IYZICO_SECRET_KEY) {
      payment.iyzicoApiKey = process.env.IYZICO_API_KEY;
      payment.iyzicoSecretKey = process.env.IYZICO_SECRET_KEY;
      payment.iyzicoBaseUrl = process.env.IYZICO_BASE_URL || payment.iyzicoBaseUrl;
      payment.enableIyzico = true;
    }
  }

  payment.bankAccounts = (payment.bankAccounts || []).filter((account) => account && account.isActive !== false);

  return payment;
}

async function getShippingConfig() {
  const settings = await loadSettings();
  return normalizeShippingConfig(settings.shipping);
}

async function resetToDefaults(adminId) {
  const defaults = mergeDefaults({ updatedBy: adminId });
  const payload = prepareForSave(defaults);

  const updated = await SiteSettings.findOneAndUpdate({}, payload, {
    new: true,
    upsert: true,
    setDefaultsOnInsert: true
  });

  cache = decryptSettings(updated);
  cacheTime = Date.now();
  return cache;
}

async function resetBranding(adminId) {
  const update = {
    general: { ...DEFAULT_SETTINGS.general },
    theme: { ...DEFAULT_SETTINGS.theme },
    updatedBy: adminId
  };

  const updated = await SiteSettings.findOneAndUpdate(
    {},
    { $set: update },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  cache = decryptSettings(updated);
  cacheTime = Date.now();
  return cache;
}

async function resetTheme(adminId) {
  const update = {
    theme: { ...DEFAULT_SETTINGS.theme },
    updatedBy: adminId
  };

  const updated = await SiteSettings.findOneAndUpdate(
    {},
    { $set: update },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  cache = decryptSettings(updated);
  cacheTime = Date.now();
  return cache;
}

async function getNotificationConfig() {
  const settings = await loadSettings();
  return settings.notifications;
}

module.exports = {
  getSettings,
  getPublicSettings,
  updateSettings,
  getEmailConfig,
  getPaymentConfig,
  getShippingConfig,
  resetToDefaults,
  resetBranding,
  resetTheme,
  getNotificationConfig,
  loadSettings
};

