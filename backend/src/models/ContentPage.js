const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema({
  question: { type: String, required: true },
  answer: { type: String, required: true }
}, { _id: false });

const policySchema = new mongoose.Schema({
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  content: { type: String, default: '' },
  lastUpdated: { type: Date, default: Date.now }
}, { _id: false });

const supportHoursSchema = new mongoose.Schema({
  weekdays: { type: String, default: 'Pazartesi - Cuma: 09:00 - 18:00' },
  saturday: { type: String, default: 'Cumartesi: 09:00 - 14:00' },
  sunday: { type: String, default: 'Pazar: Kapalı' }
}, { _id: false });

const customerServiceSchema = new mongoose.Schema({
  title: { type: String, default: 'Müşteri Hizmetleri' },
  subtitle: { type: String, default: 'Sorularınız için 7/24 buradayız' },
  description: { type: String, default: 'Siparişleriniz, iade süreçleriniz ve tüm sorularınız için müşteri hizmetleri ekibimizle iletişime geçebilirsiniz.' },
  email: { type: String, default: 'destek@anadolufenericamsanatmerkezi.com' },
  phone: { type: String, default: '+90 (212) 555 0123' },
  whatsapp: { type: String, default: '+90 (545) 555 0123' },
  supportHours: { type: supportHoursSchema, default: () => ({}) },
  responseTime: { type: String, default: 'Mesajlarınıza en geç 24 saat içinde dönüş yapıyoruz.' },
  faqHint: { type: String, default: 'Yanıtınızı bulamadıysanız bizimle iletişime geçmekten çekinmeyin.' }
}, { _id: false });

const paymentMethodSchema = new mongoose.Schema({
  key: { type: String, trim: true },
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  details: { type: String, default: '' },
  enabled: { type: Boolean, default: true }
}, { _id: false });

const paymentOptionsSchema = new mongoose.Schema({
  title: { type: String, default: 'Ödeme Yöntemleri' },
  subtitle: { type: String, default: 'Size en uygun ödeme seçeneğini seçin.' },
  securePaymentText: { type: String, default: 'Tüm ödemeler 256-bit SSL sertifikası ile güvence altındadır.' },
  methods: {
    type: [paymentMethodSchema],
    default: () => ([
      {
        key: 'credit-card',
        name: 'Kredi / Banka Kartı',
        description: 'Visa, MasterCard, Troy ve American Express kartlarıyla tek çekim veya taksitli ödeme yapabilirsiniz.'
      },
      {
        key: 'iyzico',
        name: 'İyzico Güvenli Ödeme',
        description: '3D Secure destekli İyzico ödeme altyapısı ile güvenli alışveriş.'
      },
      {
        key: 'bank-transfer',
        name: 'Havale / EFT',
        description: 'Sipariş sonrası belirtilen banka hesaplarımıza havale veya EFT yapabilirsiniz.',
        details: 'Ödeme açıklamasına sipariş numaranızı eklemeyi unutmayın.'
      },
      {
        key: 'cash-on-delivery',
        name: 'Kapıda Ödeme',
        description: 'Belirli ürünlerde ve bölgelerde kapıda ödeme seçeneği sunuyoruz.',
        details: 'Kapıda ödeme hizmet bedeli kargo firmasına göre değişiklik gösterebilir.'
      }
    ])
  }
}, { _id: false });

const contentPageSchema = new mongoose.Schema({
  about: {
    title: { type: String, default: 'Hakkımızda' },
    heroTitle: { type: String, default: 'Anadolu Feneri Cam Sanat Merkezi' },
    heroSubtitle: { type: String, default: 'Kaliteli ürünler, güvenilir hizmet' },
    mission: { type: String, default: '' },
    vision: { type: String, default: '' },
    companyInfo: {
      founded: { type: String, default: '2020' },
      location: { type: String, default: 'İstanbul, Türkiye' },
      expertise: { type: String, default: 'E-ticaret ve Dijital Pazarlama' },
      customers: { type: String, default: '10,000+' }
    }
  },
  contact: {
    title: { type: String, default: 'İletişim' },
    heroTitle: { type: String, default: 'İletişim' },
    heroSubtitle: { type: String, default: 'Sorularınız, önerileriniz veya destek talepleriniz için bizimle iletişime geçin' },
    email: { type: String, default: 'info@anadolufenericamsanatmerkezi.com' },
    supportEmail: { type: String, default: 'destek@anadolufenericamsanatmerkezi.com' },
    phone: { type: String, default: '+90 (212) 555 0123' },
    phone2: { type: String, default: '+90 (212) 555 0124' },
    address: { type: String, default: 'Maslak Mahallesi, Büyükdere Caddesi\nNo: 123, Şişli/İstanbul' },
    workingHours: {
      weekdays: { type: String, default: 'Pazartesi - Cuma: 09:00 - 18:00' },
      saturday: { type: String, default: 'Cumartesi: 09:00 - 14:00' },
      sunday: { type: String, default: 'Pazar: Kapalı' }
    }
  },
  faq: {
    type: [faqSchema],
    default: [
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
    privacyPolicy: {
      type: policySchema,
      default: () => ({
        title: 'Gizlilik Politikası',
        summary: 'Kişisel verilerinizin korunması ve gizliliğiniz bizim için önemlidir.',
        content: 'Gizliliğiniz bizim için son derece önemlidir. Anadolu Feneri Cam Sanat Merkezi olarak kişisel verilerinizi KVKK kapsamında saklıyor, üçüncü taraflarla paylaşmıyor ve yalnızca sipariş süreçlerinizi yönetmek için kullanıyoruz. Detaylı bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.'
      })
    },
    termsOfUse: {
      type: policySchema,
      default: () => ({
        title: 'Kullanım Şartları',
        summary: 'Web sitemizi kullanırken uymamız gereken temel kurallar.',
        content: 'Bu siteyi kullanarak kullanım şartlarını kabul etmiş sayılırsınız. Satın aldığınız ürünlerle ilgili tüm işlemler 6502 sayılı Tüketicinin Korunması Hakkında Kanun hükümlerine tabidir. Ayrıntılı kullanım şartları için müşteri temsilcilerimizle iletişime geçebilirsiniz.'
      })
    },
    cookiePolicy: {
      type: policySchema,
      default: () => ({
        title: 'Çerez Politikası',
        summary: 'Çerezler ne amaçla kullanılıyor?',
        content: 'Sitemizi daha iyi deneyimlemeniz ve kişiselleştirilmiş içerik sunmak için çerezler kullanıyoruz. Çerez tercihlerinizi tarayıcınız üzerinden yönetebilirsiniz. Çerez kullanımına ilişkin detaylı bilgi için müşteri hizmetlerimize ulaşabilirsiniz.'
      })
    }
  },
  support: {
    customerService: {
      type: customerServiceSchema,
      default: () => ({})
    },
    paymentOptions: {
      type: paymentOptionsSchema,
      default: () => ({})
    }
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

contentPageSchema.statics.getSingleton = async function() {
  const doc = await this.findOne().lean();
  return doc || null;
};

module.exports = mongoose.model('ContentPage', contentPageSchema);

