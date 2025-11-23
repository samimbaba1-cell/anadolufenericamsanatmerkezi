"use client";
import { useState } from "react";
import Button from "./ui/Button";
import useEmail from "../hooks/useEmail";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { sendNewsletter } = useEmail();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Newsletter subscription
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/newsletter/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setMessage("Başarıyla abone oldunuz! Teşekkürler.");
        setEmail("");
      } else {
        const data = await response.json();
        setMessage(data.message || "Bir hata oluştu.");
      }
    } catch (error) {
      setMessage("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
    setLoading(false);
  };

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold mb-4">Kampanyalardan Haberdar Olun</h2>
        <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
          Özel indirimler, yeni ürünler ve kampanyalar hakkında ilk siz haberdar olun
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="E-posta adresinizi girin"
              className="flex-1 px-4 py-3 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/50"
              required
            />
            <Button
              type="submit"
              disabled={loading}
              className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 font-semibold"
            >
              {loading ? "Abone Olunuyor..." : "Abone Ol"}
            </Button>
          </div>
          
          {message && (
            <div className={`mt-4 p-3 rounded-lg ${
              message.includes("Başarıyla") 
                ? "bg-green-500/20 text-green-100" 
                : "bg-red-500/20 text-red-100"
            }`}>
              {message}
            </div>
          )}
        </form>
        
        <p className="text-sm text-blue-200 mt-4">
          Abone olarak <a href="/privacy-policy" className="underline">Gizlilik Politikası</a>&apos;mızı kabul etmiş olursunuz.
        </p>
      </div>
    </div>
  );
}
