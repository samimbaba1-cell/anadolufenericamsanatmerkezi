"use client";

import { useState } from "react";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { useSiteContent } from "../../context/SiteContentContext";

export default function ContactPage() {
  const { content, loading: loadingContent } = useSiteContent();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    alert("Mesajınız başarıyla gönderildi! En kısa sürede size dönüş yapacağız.");
  };

  const contactInfo = content.contact;
  const customerService = content.support.customerService;
  const paymentOptions = content.support.paymentOptions;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-slate-900 mb-6">
              <span className="gradient-text">{contactInfo.heroTitle}</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              {contactInfo.heroSubtitle}
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Bize Mesaj Gönderin</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Ad Soyad *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full input-modern"
                      placeholder="Adınız ve soyadınız"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      E-posta *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full input-modern"
                      placeholder="ornek@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                    Konu *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full input-modern"
                    placeholder="Mesaj konusu"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Mesaj *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={6}
                    className="w-full input-modern"
                    placeholder="Mesajınızı buraya yazın..."
                  />
                </div>

                <Button type="submit" className="w-full btn-primary">
                  Mesaj Gönder
                </Button>
              </form>
            </Card>

            <div className="space-y-8">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">İletişim Bilgileri</h2>
                {loadingContent ? (
                  <div className="space-y-3">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">E-posta</h3>
                        <p className="text-slate-600">{contactInfo.email}</p>
                        {contactInfo.supportEmail && <p className="text-slate-600">{contactInfo.supportEmail}</p>}
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Telefon</h3>
                        <p className="text-slate-600">{contactInfo.phone}</p>
                        {contactInfo.phone2 && <p className="text-slate-600">{contactInfo.phone2}</p>}
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Adres</h3>
                        <p className="text-slate-600 whitespace-pre-line">{contactInfo.address}</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 mb-1">Çalışma Saatleri</h3>
                        <p className="text-slate-600">{contactInfo.workingHours.weekdays}</p>
                        <p className="text-slate-600">{contactInfo.workingHours.saturday}</p>
                        <p className="text-slate-600">{contactInfo.workingHours.sunday}</p>
                      </div>
                    </div>
                  </div>
                )}
              </Card>

              <Card className="p-8 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{customerService.title}</h2>
                  <p className="text-slate-600">{customerService.subtitle}</p>
                </div>

                <p className="text-slate-600 leading-relaxed">{customerService.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                    <h3 className="text-sm font-semibold text-blue-700 mb-1">E-posta</h3>
                    <p className="text-sm text-blue-900">{customerService.email}</p>
                  </div>
                  <div className="rounded-lg border border-green-100 bg-green-50 p-4">
                    <h3 className="text-sm font-semibold text-green-700 mb-1">Telefon</h3>
                    <p className="text-sm text-green-900">{customerService.phone}</p>
                    {customerService.whatsapp && (
                      <p className="text-sm text-green-700 mt-1">WhatsApp: {customerService.whatsapp}</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2">Destek Saatleri</h3>
                  <div className="space-y-1 text-sm text-slate-600">
                    <p>{customerService.supportHours.weekdays}</p>
                    <p>{customerService.supportHours.saturday}</p>
                    <p>{customerService.supportHours.sunday}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
                  <p className="font-semibold mb-1">Yanıt Süresi</p>
                  <p>{customerService.responseTime}</p>
                </div>
              </Card>

              <Card className="p-8 space-y-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{paymentOptions.title}</h2>
                  <p className="text-slate-600">{paymentOptions.subtitle}</p>
                </div>
                <p className="text-sm text-slate-500">{paymentOptions.securePaymentText}</p>

                <div className="space-y-4">
                  {paymentOptions.methods.map((method) => (
                    <div key={method.key || method.name} className="rounded-lg border border-slate-200 p-4">
                      <h3 className="text-lg font-semibold text-slate-900">{method.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">{method.description}</p>
                      {method.details && (
                        <p className="text-sm text-slate-500 mt-2">{method.details}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-8">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Sık Sorulan Sorular</h2>
                {content.faq.length === 0 ? (
                  <p className="text-sm text-slate-500">{customerService.faqHint}</p>
                ) : (
                  <div className="space-y-4">
                    {content.faq.map((item, index) => (
                      <div key={index}>
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.question}</h3>
                        <p className="text-slate-600 whitespace-pre-line">{item.answer}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}