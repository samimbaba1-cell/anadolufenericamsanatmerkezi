const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  bankName: { type: String, required: true, trim: true },
  accountName: { type: String, required: true, trim: true },
  iban: { type: String, required: true, trim: true },
  branch: { type: String, trim: true },
  accountNumber: { type: String, trim: true },
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const siteSettingsSchema = new mongoose.Schema({
  general: {
    siteName: { type: String, default: 'Anadolu Feneri Cam Sanat Merkezi' },
    siteDescription: { type: String, default: 'Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat' },
    siteSlogan: { type: String, default: 'Kaliteli ürünler, güvenilir hizmet' },
    logoUrl: { type: String, default: '/images/logo-placeholder.png' },
    faviconUrl: { type: String, default: '/icons/icon-192.svg' }
  },
  contact: {
    email: { type: String, default: 'info@anadolufenericamsanatmerkezi.com' },
    phone: { type: String, default: '+90 (212) 555-0123' },
    address: { type: String, default: 'İstanbul, Türkiye' },
    whatsapp: { type: String },
    supportHours: { type: String, default: 'Hafta içi 09:00 - 18:00' }
  },
  social: {
    facebook: { type: String },
    instagram: { type: String },
    twitter: { type: String },
    linkedin: { type: String },
    youtube: { type: String }
  },
  seo: {
    metaTitle: { type: String, default: 'Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş' },
    metaDescription: { type: String, default: 'En kaliteli ürünleri uygun fiyatlarla bulun' },
    keywords: { type: String, default: 'e-ticaret, online alışveriş, kaliteli ürünler' }
  },
  analytics: {
    googleAnalyticsId: { type: String },
    googleAnalyticsEnabled: { type: Boolean, default: false },
    facebookPixelId: { type: String },
    facebookPixelEnabled: { type: Boolean, default: false },
    tawkToId: { type: String },
    customScriptsHead: { type: String },
    customScriptsBody: { type: String }
  },
  email: {
    enableSmtp: { type: Boolean, default: false },
    host: { type: String, default: 'smtp.gmail.com' },
    port: { type: Number, default: 587 },
    secure: { type: Boolean, default: false },
    user: { type: String },
    password: { type: String }, // encrypted
    fromEmail: { type: String, default: 'noreply@anadolufenericamsanatmerkezi.com' },
    fromName: { type: String, default: 'Anadolu Feneri Cam Sanat Merkezi' }
  },
  payment: {
    enableIyzico: { type: Boolean, default: true },
    iyzicoApiKey: { type: String }, // encrypted
    iyzicoSecretKey: { type: String }, // encrypted
    iyzicoBaseUrl: { type: String, default: 'https://sandbox-api.iyzipay.com' },
    enableCashOnDelivery: { type: Boolean, default: true },
    enableBankTransfer: { type: Boolean, default: false },
    bankAccounts: { type: [bankAccountSchema], default: [] }
  },
  shipping: {
    enableFreeShipping: { type: Boolean, default: true },
    freeShippingThreshold: { type: Number, default: 500 },
    shippingCost: { type: Number, default: 25 },
    shippingCompanies: {
      type: [{ type: String }],
      default: ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo']
    },
    defaultShippingCompany: { type: String, default: 'Aras Kargo' },
    estimatedDeliveryDays: { type: Number, default: 3 }
  },
  notifications: {
    enableEmailNotifications: { type: Boolean, default: true },
    alertEmail: { type: String },
    lowStockAlert: { type: Boolean, default: true },
    orderEmailsToAdmin: { type: Boolean, default: true }
  },
  theme: {
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#8B5CF6' },
    accentColor: { type: String, default: '#F59E0B' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    surfaceColor: { type: String, default: '#F8FAFC' },
    successColor: { type: String, default: '#10B981' },
    warningColor: { type: String, default: '#F59E0B' },
    errorColor: { type: String, default: '#EF4444' },
    foregroundColor: { type: String, default: '#0F172A' },
    borderColor: { type: String, default: '#E2E8F0' },
    buttonRadius: { type: Number, default: 8 },
    activePreset: { type: String, default: 'modern-blue' },
    fontFamily: { type: String, default: 'inter' },
    headingFont: { type: String, default: 'Inter' },
    bodyFont: { type: String, default: 'Inter' },
    layout: {
      headerStyle: { type: String, default: 'default' },
      footerStyle: { type: String, default: 'default' },
      sidebarPosition: { type: String, default: 'right' },
      productGrid: { type: String, default: '4-columns' },
      cardStyle: { type: String, default: 'default' },
      buttonStyle: { type: String, default: 'rounded' },
      borderRadius: { type: String, default: 'medium' },
      shadow: { type: String, default: 'medium' }
    },
    layoutTokens: {
      headerHeight: { type: String, default: '64px' },
      footerHeight: { type: String, default: '200px' },
      maxWidth: { type: String, default: '1280px' },
      borderRadius: { type: String, default: '8px' },
      shadow: {
        type: String,
        default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
      }
    },
    animations: {
      enableAnimations: { type: Boolean, default: true },
      animationSpeed: { type: String, default: 'normal' },
      hoverEffects: { type: Boolean, default: true },
      pageTransitions: { type: Boolean, default: true },
      duration: { type: String, default: '300ms' },
      easing: { type: String, default: 'ease-in-out' }
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

siteSettingsSchema.statics.getSingleton = async function() {
  const doc = await this.findOne().lean();
  return doc || null;
};

module.exports = mongoose.model('SiteSettings', siteSettingsSchema);

