"use client";

export const dynamic = 'force-dynamic';
import Card from "../../components/ui/Card";

export default function ReturnsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Card className="p-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-6 text-center">İade ve Değişim</h1>
        <p className="text-slate-700 mb-4">Müşteri memnuniyeti bizim için önceliklidir. Aşağıdaki koşullar kapsamında iade ve değişim işlemlerinizi kolayca yapabilirsiniz.</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">İade Koşulları</h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2">
              <li>Ürünü teslim aldıktan sonra 14 gün içinde iade talebinde bulunabilirsiniz.</li>
              <li>Ürün kullanılmamış, yeniden satılabilir durumda ve orijinal ambalajında olmalıdır.</li>
              <li>Faturası ve tüm aksesuarları ile birlikte gönderilmelidir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Değişim Koşulları</h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2">
              <li>Yanlış beden/renk seçimi veya kusurlu ürün için değişim talep edebilirsiniz.</li>
              <li>Değişim işlemleri stok durumuna göre gerçekleştirilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">İade Süreci</h2>
            <ol className="list-decimal pl-5 text-slate-700 space-y-2">
              <li>Hesabınıza giriş yapın ve &quot;Siparişlerim&quot; sayfasından ilgili siparişi seçin.</li>
              <li>&quot;İade/Değişim Talebi&quot; butonuna tıklayarak formu doldurun.</li>
              <li>Onaylandıktan sonra size iletilen kargo kodu ile ürünü gönderin.</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">İade Edilemeyen Ürünler</h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-2">
              <li>Kullanılmış veya hasar görmüş ürünler</li>
              <li>Kozmetik ve hijyen ürünlerinde ambalajı açılmış ürünler</li>
              <li>Özel sipariş ve kişiselleştirilmiş ürünler</li>
            </ul>
          </section>

          <p className="text-slate-700">Detaylı bilgi için bizimle <a href="/contact" className="text-primary underline">iletişime geçebilirsiniz</a>.</p>
        </div>
      </Card>
    </main>
  );
}


