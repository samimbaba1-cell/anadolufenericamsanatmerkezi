export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

const FALLBACK_POLICY = {
  title: "Gizlilik Politikası",
  summary: "Kişisel verilerinizin korunması ve gizliliğiniz bizim için önemlidir.",
  content:
    "Gizliliğiniz bizim için son derece önemlidir. Anadolu Feneri Cam Sanat Merkezi olarak kişisel verilerinizi KVKK kapsamında saklıyor, üçüncü taraflarla paylaşmıyor ve yalnızca sipariş süreçlerinizi yönetmek için kullanıyoruz. Detaylı bilgi için müşteri hizmetlerimizle iletişime geçebilirsiniz.",
  lastUpdated: new Date().toISOString()
};

async function getContent() {
  try {
    const res = await fetch(`${API_URL}/api/content`, { cache: "no-store" });
    if (!res.ok) {
      throw new Error("İçerik alınamadı");
    }
    return res.json();
  } catch (error) {
    console.error("Privacy policy load error:", error);
    return null;
  }
}

function renderParagraphs(text = "") {
  return text
    .split(/\n+/)
    .filter(Boolean)
    .map((paragraph, index) => (
      <p key={index} className="text-lg leading-relaxed text-slate-600">
        {paragraph.trim()}
      </p>
    ));
}

export default async function PrivacyPolicyPage() {
  const content = await getContent();
  const policy = content?.legal?.privacyPolicy || FALLBACK_POLICY;

  return (
    <main className="storefront-page py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <header className="space-y-4 text-center">
          <h1 className="text-4xl font-bold text-slate-900">{policy.title}</h1>
          {policy.summary && <p className="text-lg text-slate-600">{policy.summary}</p>}
          {policy.lastUpdated && (
            <p className="text-sm text-slate-500">
              Son güncelleme: {new Date(policy.lastUpdated).toLocaleDateString("tr-TR")}
            </p>
          )}
        </header>

        <section className="rounded-2xl bg-white p-8 shadow-lg space-y-6">
          {renderParagraphs(policy.content)}
        </section>
      </div>
    </main>
  );
}

