const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ContentPage = sequelize.define('ContentPage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  // All content as JSON fields
  about: {
    type: DataTypes.JSON,
    defaultValue: {
      title: 'Hakkımızda',
      heroTitle: 'Anadolu Feneri Cam Sanat Merkezi',
      heroSubtitle: 'Kaliteli ürünler, güvenilir hizmet',
      mission: '',
      vision: '',
      companyInfo: {
        founded: '2020',
        location: 'İstanbul, Türkiye',
        expertise: 'E-ticaret ve Dijital Pazarlama',
        customers: '10,000+'
      }
    }
  },
  contact: {
    type: DataTypes.JSON,
    defaultValue: {
      title: 'İletişim',
      heroTitle: 'İletişim',
      heroSubtitle: 'Sorularınız, önerileriniz veya destek talepleriniz için bizimle iletişime geçin',
      email: 'info@anadolufenericamsanatmerkezi.com',
      supportEmail: 'destek@anadolufenericamsanatmerkezi.com',
      phone: '+90 (212) 555 0123',
      phone2: '+90 (212) 555 0124',
      address: 'Maslak Mahallesi, Büyükdere Caddesi\nNo: 123, Şişli/İstanbul',
      workingHours: {
        weekdays: 'Pazartesi - Cuma: 09:00 - 18:00',
        saturday: 'Cumartesi: 09:00 - 14:00',
        sunday: 'Pazar: Kapalı'
      }
    }
  },
  testimonials: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  faq: {
    type: DataTypes.JSON,
    defaultValue: [
      {
        question: 'Siparişim ne zaman kargoya verilir?',
        answer: 'Siparişleriniz 1-2 iş günü içinde kargoya verilir.'
      },
      {
        question: 'İade işlemi nasıl yapılır?',
        answer: '14 gün içinde ücretsiz iade hakkınız bulunmaktadır.'
      },
      {
        question: 'Kargo ücreti ne kadar?',
        answer: '150 TL ve üzeri alışverişlerde kargo ücretsizdir.'
      }
    ]
  },
  legal: {
    type: DataTypes.JSON,
    defaultValue: {
      privacyPolicy: {
        title: 'Gizlilik Politikası',
        summary: 'Kişisel verilerinizin korunması ve gizliliğiniz bizim için önemlidir.',
        content: 'Gizliliğiniz bizim için son derece önemlidir...',
        lastUpdated: new Date()
      },
      termsOfUse: {
        title: 'Kullanım Şartları',
        summary: 'Web sitemizi kullanırken uymamız gereken temel kurallar.',
        content: 'Bu siteyi kullanarak kullanım şartlarını kabul etmiş sayılırsınız...',
        lastUpdated: new Date()
      },
      cookiePolicy: {
        title: 'Çerez Politikası',
        summary: 'Çerezler ne amaçla kullanılıyor?',
        content: 'Sitemizi daha iyi deneyimlemeniz için çerezler kullanıyoruz...',
        lastUpdated: new Date()
      }
    }
  },
  support: {
    type: DataTypes.JSON,
    defaultValue: {
      customerService: {
        title: 'Müşteri Hizmetleri',
        subtitle: 'Sorularınız için 7/24 buradayız',
        description: 'Siparişleriniz, iade süreçleriniz ve tüm sorularınız için müşteri hizmetleri ekibimizle iletişime geçebilirsiniz.',
        email: 'destek@anadolufenericamsanatmerkezi.com',
        phone: '+90 (212) 555 0123',
        whatsapp: '+90 (545) 555 0123',
        supportHours: {
          weekdays: 'Pazartesi - Cuma: 09:00 - 18:00',
          saturday: 'Cumartesi: 09:00 - 14:00',
          sunday: 'Pazar: Kapalı'
        },
        responseTime: 'Mesajlarınıza en geç 24 saat içinde dönüş yapıyoruz.',
        faqHint: 'Yanıtınızı bulamadıysanız bizimle iletişime geçmekten çekinmeyin.'
      },
      paymentOptions: {
        title: 'Ödeme Yöntemleri',
        subtitle: 'Size en uygun ödeme seçeneğini seçin.',
        securePaymentText: 'Tüm ödemeler 256-bit SSL sertifikası ile güvence altındadır.',
        methods: [
          {
            key: 'credit-card',
            name: 'Kredi / Banka Kartı',
            description: 'Visa, MasterCard, Troy ve American Express kartlarıyla tek çekim veya taksitli ödeme yapabilirsiniz.',
            enabled: true
          },
          {
            key: 'iyzico',
            name: 'İyzico Güvenli Ödeme',
            description: '3D Secure destekli İyzico ödeme altyapısı ile güvenli alışveriş.',
            enabled: true
          },
          {
            key: 'bank-transfer',
            name: 'Havale / EFT',
            description: 'Sipariş sonrası belirtilen banka hesaplarımıza havale veya EFT yapabilirsiniz.',
            details: 'Ödeme açıklamasına sipariş numaranızı eklemeyi unutmayın.',
            enabled: true
          },
          {
            key: 'cash-on-delivery',
            name: 'Kapıda Ödeme',
            description: 'Belirli ürünlerde ve bölgelerde kapıda ödeme seçeneği sunuyoruz.',
            details: 'Kapıda ödeme hizmet bedeli kargo firmasına göre değişiklik gösterebilir.',
            enabled: true
          }
        ]
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
  tableName: 'content_pages',
  timestamps: true,
  underscored: false
});

// Static method for singleton pattern
ContentPage.getSingleton = async function() {
  let content = await ContentPage.findOne();
  if (!content) {
    content = await ContentPage.create({});
  }
  return content;
};

module.exports = ContentPage;
