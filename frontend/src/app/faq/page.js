"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useState } from "react";
import Card from "../../components/ui/Card";

export default function FAQPage() {
  const [openItems, setOpenItems] = useState({});

  const toggleItem = (index) => {
    setOpenItems(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const faqData = [
    {
      category: "Sipariş ve Teslimat",
      questions: [
        {
          question: "Siparişimi nasıl verebilirim?",
          answer: "Ürünleri sepete ekleyerek sipariş verebilirsiniz. Sepetinizi kontrol ettikten sonra 'Siparişi Tamamla' butonuna tıklayarak ödeme sayfasına geçebilirsiniz."
        },
        {
          question: "Teslimat süresi ne kadar?",
          answer: "Standart teslimat süremiz 1-3 iş günüdür. Hızlı teslimat seçeneği ile aynı gün teslimat da mümkündür."
        },
        {
          question: "Kargo ücreti ne kadar?",
          answer: "500 TL ve üzeri alışverişlerde kargo ücretsizdir. 500 TL altındaki siparişlerde 25 TL kargo ücreti alınır."
        },
        {
          question: "Siparişimi takip edebilir miyim?",
          answer: "Evet, sipariş numaranız ile siparişinizin durumunu takip edebilirsiniz. Ayrıca size SMS ve e-posta ile bilgilendirme yapılır."
        }
      ]
    },
    {
      category: "Ödeme",
      questions: [
        {
          question: "Hangi ödeme yöntemlerini kabul ediyorsunuz?",
          answer: "Kredi kartı, banka kartı, havale/EFT ve kapıda ödeme seçeneklerini kabul ediyoruz."
        },
        {
          question: "Ödeme güvenli mi?",
          answer: "Evet, tüm ödemeler 256-bit SSL şifreleme ile güvenli bir şekilde işlenir. Kart bilgileriniz saklanmaz."
        },
        {
          question: "Taksit yapabilir miyim?",
          answer: "Kredi kartı ile 2-12 taksit arası seçeneklerimiz mevcuttur. Taksit seçenekleri kart türüne göre değişiklik gösterebilir."
        }
      ]
    },
    {
      category: "İade ve Değişim",
      questions: [
        {
          question: "Ürünü iade edebilir miyim?",
          answer: "Evet, 14 gün içinde ürünü iade edebilirsiniz. Ürün orijinal ambalajında ve kullanılmamış durumda olmalıdır."
        },
        {
          question: "İade süreci nasıl işler?",
          answer: "İade talebinizi müşteri hizmetlerimize bildirin. Size iade kargo etiketi gönderilir. Ürün bize ulaştıktan sonra 3-5 iş günü içinde iade işleminiz tamamlanır."
        },
        {
          question: "İade ücreti kim karşılar?",
          answer: "Ürün hatası veya yanlış gönderim durumunda iade kargo ücretini biz karşılarız. Müşteri kaynaklı iadelerde kargo ücreti müşteriye aittir."
        }
      ]
    },
    {
      category: "Hesap ve Üyelik",
      questions: [
        {
          question: "Hesap oluşturmak zorunlu mu?",
          answer: "Hayır, misafir olarak da alışveriş yapabilirsiniz. Ancak hesap oluşturarak siparişlerinizi takip edebilir ve daha hızlı alışveriş yapabilirsiniz."
        },
        {
          question: "Şifremi unuttum, ne yapmalıyım?",
          answer: "Giriş sayfasında 'Şifremi Unuttum' linkine tıklayarak e-posta adresinize şifre sıfırlama bağlantısı gönderebilirsiniz."
        },
        {
          question: "Hesabımı nasıl silebilirim?",
          answer: "Hesap silme talebinizi müşteri hizmetlerimize bildirin. 7 gün içinde hesabınız silinir ve tüm kişisel verileriniz güvenli bir şekilde kaldırılır."
        }
      ]
    },
    {
      category: "Teknik Destek",
      questions: [
        {
          question: "Site çalışmıyor, ne yapmalıyım?",
          answer: "Önce tarayıcınızı yenileyin. Sorun devam ederse farklı bir tarayıcı deneyin. Hala sorun yaşıyorsanız müşteri hizmetlerimizle iletişime geçin."
        },
        {
          question: "Mobil uygulamanız var mı?",
          answer: "Şu anda web sitemiz mobil uyumludur. Mobil uygulamamız geliştirme aşamasındadır."
        },
        {
          question: "Çerezleri kabul etmek zorunda mıyım?",
          answer: "Sitemizin düzgün çalışması için gerekli çerezleri kabul etmeniz gerekmektedir. Kişisel verileriniz gizlilik politikamıza uygun şekilde korunur."
        }
      ]
    }
  ];

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Sıkça Sorulan Sorular</h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Merak ettiğiniz soruların cevaplarını burada bulabilirsiniz
        </p>
      </div>

      <div className="space-y-8">
        {faqData.map((category, categoryIndex) => (
          <div key={categoryIndex}>
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">{category.category}</h2>
            <div className="space-y-4">
              {category.questions.map((item, questionIndex) => {
                const globalIndex = `${categoryIndex}-${questionIndex}`;
                const isOpen = openItems[globalIndex];
                
                return (
                  <Card key={questionIndex} className="overflow-hidden">
                    <button
                      onClick={() => toggleItem(globalIndex)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <span className="font-medium text-gray-900 pr-4">{item.question}</span>
                      <svg
                        className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isOpen && (
                      <div className="px-6 pb-4">
                        <div className="border-t border-gray-200 pt-4">
                          <p className="text-gray-600 leading-relaxed">{item.answer}</p>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Card className="p-8 rounded-2xl overflow-hidden section-muted-band border border-border">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Aradığınız cevabı bulamadınız mı?
          </h3>
          <p className="text-gray-600 mb-6">
            Müşteri hizmetlerimizle iletişime geçin, size yardımcı olmaktan mutluluk duyarız.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/contact"
              className="btn-primary"
            >
              İletişime Geç
            </a>
            <a
              href="tel:+902125550123"
              className="btn-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Hemen Ara
            </a>
          </div>
        </Card>
      </div>
    </main>
  );
}
