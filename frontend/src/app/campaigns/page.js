"use client";

export const dynamic = 'force-dynamic';
import Card from "../../components/ui/Card";

export default function CampaignsPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Kampanyalar</h1>
        <p className="text-slate-600">Güncel kampanyalar ve indirimler burada listelenecek.</p>
      </div>

      <Card className="p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Yakında burada!</h2>
        <p className="text-slate-600">Admin panelinden kampanya eklediğinizde burada görünecek.</p>
      </Card>
    </main>
  );
}


