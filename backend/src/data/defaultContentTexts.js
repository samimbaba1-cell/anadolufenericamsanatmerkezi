/** Varsayılan mağaza içerikleri — boş DB alanlarında kullanılır */

const SITE = 'Anadolu Feneri Cam Sanat Merkezi';
const DOMAIN = 'anadolufenericamsanatmerkezi.com';
const EMAIL = 'info@anadolufenericamsanatmerkezi.com';
const SUPPORT = 'destek@anadolufenericamsanatmerkezi.com';

const privacyPolicyContent = `1. Veri Sorumlusu
${SITE} ("Şirket") olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusuyuz. İletişim: ${EMAIL}

2. Toplanan Kişisel Veriler
• Kimlik ve iletişim: ad, soyad, e-posta, telefon, teslimat/fatura adresi
• Sipariş ve ödeme: sipariş geçmişi, ödeme yöntemi bilgisi (kart numarası saklanmaz; ödeme İyzico altyapısı üzerinden işlenir)
• Teknik veriler: IP adresi, çerezler, tarayıcı bilgisi, oturum kayıtları
• Müşteri hizmetleri: talep ve yazışma içerikleri

3. İşleme Amaçları
Siparişin oluşturulması ve teslimi, ödeme işlemleri, müşteri desteği, yasal yükümlülükler, site güvenliği, kampanya bilgilendirmesi (açık rıza ile) ve hizmet kalitesinin artırılması.

4. Hukuki Sebepler
KVKK m.5/2 (sözleşmenin kurulması ve ifası, hukuki yükümlülük) ve gerektiğinde açık rızanız.

5. Aktarım
Kargo firmaları, ödeme kuruluşu (İyzico), barındırma/e-posta hizmet sağlayıcıları ve yasal mercilerle, amaçla sınırlı ve gerekli ölçüde paylaşım yapılabilir.

6. Saklama Süresi
Yasal zamanaşımı ve ticari kayıt süreleri boyunca; amaç ortadan kalkınca silme, yok etme veya anonimleştirme uygulanır.

7. Haklarınız
KVKK m.11 kapsamında; verilerinize erişim, düzeltme, silme, işlemeyi kısıtlama, itiraz ve Şikâyet hakkınızı kullanabilirsiniz. Başvuru: ${SUPPORT}

8. Güvenlik
SSL/TLS şifreleme, erişim kontrolleri ve güncel güvenlik önlemleri uygulanır.

9. Değişiklikler
Bu politika güncellenebilir; güncel metin ${DOMAIN} üzerinde yayımlanır.`;

const termsOfUseContent = `1. Taraflar ve Kabul
Bu Kullanım Şartları, ${SITE} internet sitesini ("Site") kullanan ziyaretçi ve müşteriler ile Şirket arasındaki hukuki çerçeveyi belirler. Siteyi kullanarak bu şartları kabul etmiş sayılırsınız.

2. Hizmet Kapsamı
Site üzerinden cam sanat ürünleri ve ilgili ürünlerin çevrimiçi satışı sunulur. Ürün görselleri ve açıklamaları bilgilendirme amaçlıdır; el yapımı ürünlerde küçük ton ve form farklılıkları olabilir.

3. Üyelik ve Hesap Güvenliği
Hesap bilgilerinizin gizliliğinden siz sorumlusunuz. Yanlış veya eksik bilgi verilmesinden doğan sonuçlardan müşteri sorumludur.

4. Sipariş ve Sözleşme
Sipariş, ödeme onayı ve sipariş teyidi e-postası ile kesinleşir. Stok yetersizliği halinde iade veya alternatif ürün önerisi sunulur.

5. Fiyat ve Ödeme
Fiyatlar Türk Lirası (TRY) üzerinden gösterilir; vergiler sipariş özetinde belirtilir. Ödeme kredi/banka kartı, havale/EFT veya Site'de sunulan diğer yöntemlerle alınabilir.

6. Teslimat
Teslimat süreleri ürün ve bölgeye göre değişir; tahmini süre sipariş aşamasında gösterilir. Kargo kayıp/hasar durumunda ${SUPPORT} ile iletişime geçiniz.

7. Cayma Hakkı (6502 sayılı Kanun)
Mesafeli sözleşmelerde, teslimattan itibaren 14 gün içinde cayma hakkınız vardır (istisnai ürünler kanunda belirtilmiştir). İade koşulları İade ve Değişim sayfasında yer alır.

8. Garanti ve Ayıplı Mal
Ayıplı veya hatalı ürünlerde kanuni haklarınız saklıdır; bildirim için makul süre içinde müşteri hizmetlerine başvurunuz.

9. Fikri Mülkiyet
Site tasarımı, metin, logo ve görseller Şirket'e veya lisans verenlere aittir; izinsiz kopyalanamaz.

10. Sorumluluk Sınırı
Şirket, mücbir sebep, teknik arıza veya üçüncü taraf hizmet kesintilerinden doğan dolaylı zararlardan, kanunun izin verdiği ölçüde sorumlu değildir.

11. Uyuşmazlık
Tüketici işlemlerinde Tüketici Hakem Heyetleri ve Tüketici Mahkemeleri yetkilidir. İletişim: ${EMAIL}`;

const cookiePolicyContent = `1. Çerez Nedir?
Çerezler, Site ziyaretiniz sırasında cihazınıza kaydedilen küçük metin dosyalarıdır.

2. Kullandığımız Çerez Türleri
• Zorunlu çerezler: oturum, sepet, güvenlik ve temel site işlevleri için gereklidir.
• İşlevsel çerezler: dil, tercih ve kullanıcı deneyimi ayarları.
• Analitik çerezler: ziyaret istatistikleri (Google Analytics açıksa).
• Pazarlama çerezleri: kampanya ölçümü (Facebook Pixel açıksa, rıza ile).

3. Üçüncü Taraf Çerezleri
Ödeme (İyzico), analitik ve sosyal medya eklentileri kendi çerezlerini kullanabilir; politikaları ilgili sağlayıcı sitelerinde yer alır.

4. Yönetim
Tarayıcı ayarlarından çerezleri silebilir veya engelleyebilirsiniz. Zorunlu çerezlerin kapatılması Site işlevlerini kısıtlayabilir.

5. Saklama
Oturum çerezleri tarayıcı kapanınca; kalıcı çerezler belirtilen süre sonunda veya siz silene kadar saklanabilir.

6. İletişim
Çerez politikası hakkında: ${SUPPORT}`;

module.exports = {
  about: {
    missionImageUrl: '',
    companyImageUrl: '',
    values: [
      { title: 'Kalite', description: 'El yapımı cam ürünlerde titiz işçilik ve kalite kontrolü.', iconUrl: '' },
      { title: 'Güven', description: 'Şeffaf fiyatlandırma ve güvenli ödeme altyapısı.', iconUrl: '' },
      { title: 'Sanat', description: 'Geleneksel cam sanatını modern tasarımla buluşturuyoruz.', iconUrl: '' }
    ],
    cta: {
      title: 'Bizimle İletişime Geçin',
      subtitle: 'Sorularınız için müşteri hizmetlerimiz yanınızda',
      primaryLabel: 'İletişim Sayfası',
      primaryLink: '/iletisim',
      secondaryLabel: 'Ürünlerimizi İncele',
      secondaryLink: '/products'
    }
  },
  testimonials: [
    {
      name: 'Ayşe K.',
      role: 'Müşteri',
      content: 'El yapımı cam ürünler harika, paketleme çok özenliydi. Kesinlikle tekrar alışveriş yapacağım.',
      rating: 5,
      avatarUrl: ''
    },
    {
      name: 'Mehmet T.',
      role: 'Müşteri',
      content: 'Hediye olarak aldığım vazo beklediğimden de güzeldi. Teslimat hızlıydı.',
      rating: 5,
      avatarUrl: ''
    },
    {
      name: 'Zeynep A.',
      role: 'Müşteri',
      content: 'Müşteri hizmetleri sorularıma hemen döndü. Güvenle alışveriş yapılabilir.',
      rating: 5,
      avatarUrl: ''
    }
  ],
  legal: {
    privacyPolicy: {
      title: 'Gizlilik Politikası',
      summary: 'Kişisel verileriniz KVKK kapsamında korunur; yalnızca sipariş ve hizmet amaçlı işlenir.',
      content: privacyPolicyContent,
      lastUpdated: new Date().toISOString()
    },
    termsOfUse: {
      title: 'Kullanım Şartları ve Mesafeli Satış',
      summary: 'Site kullanımı, sipariş, ödeme, teslimat ve cayma hakkına ilişkin koşullar.',
      content: termsOfUseContent,
      lastUpdated: new Date().toISOString()
    },
    cookiePolicy: {
      title: 'Çerez Politikası',
      summary: 'Çerez türleri, kullanım amaçları ve tercih yönetimi.',
      content: cookiePolicyContent,
      lastUpdated: new Date().toISOString()
    }
  }
};
