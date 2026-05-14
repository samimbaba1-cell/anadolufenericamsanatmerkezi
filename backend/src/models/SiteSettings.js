const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SiteSettings = sequelize.define('SiteSettings', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // All settings as JSON fields for flexibility
  general: {
    type: DataTypes.JSON,
    defaultValue: {
      siteName: 'Anadolu Feneri Cam Sanat Merkezi',
      siteDescription: 'Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat',
      siteSlogan: 'Kaliteli ürünler, güvenilir hizmet',
      logoUrl: '/images/logo-placeholder.png',
      faviconUrl: '/icons/icon-192.svg'
    }
  },
  contact: {
    type: DataTypes.JSON,
    defaultValue: {
      email: 'info@anadolufenericamsanatmerkezi.com',
      phone: '+90 (212) 555-0123',
      address: 'İstanbul, Türkiye',
      whatsapp: '',
      supportHours: 'Hafta içi 09:00 - 18:00'
    }
  },
  social: {
    type: DataTypes.JSON,
    defaultValue: {
      facebook: '',
      instagram: '',
      twitter: '',
      linkedin: '',
      youtube: ''
    }
  },
  seo: {
    type: DataTypes.JSON,
    defaultValue: {
      metaTitle: 'Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş',
      metaDescription: 'En kaliteli ürünleri uygun fiyatlarla bulun',
      keywords: 'e-ticaret, online alışveriş, kaliteli ürünler'
    }
  },
  analytics: {
    type: DataTypes.JSON,
    defaultValue: {
      googleAnalyticsId: '',
      googleAnalyticsEnabled: false,
      facebookPixelId: '',
      facebookPixelEnabled: false,
      tawkToId: '',
      customScriptsHead: '',
      customScriptsBody: ''
    }
  },
  email: {
    type: DataTypes.JSON,
    defaultValue: {
      enableSmtp: false,
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: '',
      password: '', // encrypted
      fromEmail: 'noreply@anadolufenericamsanatmerkezi.com',
      fromName: 'Anadolu Feneri Cam Sanat Merkezi'
    }
  },
  payment: {
    type: DataTypes.JSON,
    defaultValue: {
      enableIyzico: true,
      iyzicoApiKey: '', // encrypted
      iyzicoSecretKey: '', // encrypted
      iyzicoBaseUrl: 'https://sandbox-api.iyzipay.com',
      enableCashOnDelivery: true,
      enableBankTransfer: false,
      bankAccounts: []
    }
  },
  shipping: {
    type: DataTypes.JSON,
    defaultValue: {
      enableFreeShipping: true,
      freeShippingThreshold: 500,
      shippingCost: 25,
      shippingCompanies: ['Aras Kargo', 'Yurtiçi Kargo', 'MNG Kargo'],
      defaultShippingCompany: 'Aras Kargo',
      estimatedDeliveryDays: 3
    }
  },
  notifications: {
    type: DataTypes.JSON,
    defaultValue: {
      enableEmailNotifications: true,
      alertEmail: '',
      lowStockAlert: true,
      orderEmailsToAdmin: true
    }
  },
  theme: {
    type: DataTypes.JSON,
    defaultValue: {
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
  },
  updatedById: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    field: 'updated_by_id'
  }
}, {
  tableName: 'site_settings',
  timestamps: true,
  underscored: false
});

// Static method for singleton pattern
SiteSettings.getSingleton = async function() {
  let settings = await SiteSettings.findOne();
  if (!settings) {
    settings = await SiteSettings.create({});
  }
  return settings;
};

module.exports = SiteSettings;
