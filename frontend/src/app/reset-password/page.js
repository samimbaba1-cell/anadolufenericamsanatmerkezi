"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useLocale } from "../../context/LocaleContext";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

function ResetPasswordContent() {
  const { routes, t } = useLocale();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setError("Geçersiz veya eksik token. Lütfen email'inizdeki bağlantıyı kullanın.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (password !== confirmPassword) {
      setError("Şifreler eşleşmiyor");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Şifre en az 8 karakter olmalıdır");
      setLoading(false);
      return;
    }
    if (!/(?=.*[a-z])/.test(password)) {
      setError("Şifre en az bir küçük harf içermelidir");
      setLoading(false);
      return;
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      setError("Şifre en az bir büyük harf içermelidir");
      setLoading(false);
      return;
    }
    if (!/(?=.*\d)/.test(password)) {
      setError("Şifre en az bir rakam içermelidir");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token, password })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage("Şifreniz başarıyla sıfırlandı. Giriş sayfasına yönlendiriliyorsunuz...");
        setTimeout(() => {
          router.push(routes.login);
        }, 2000);
      } else {
        setError(data.error || data.message || "Bir hata oluştu");
      }
    } catch (error) {
      setError("Bir hata oluştu. Lütfen tekrar deneyin.");
    }
    setLoading(false);
  };

  if (!token && !error) {
    return (
      <main className="auth-page-shell flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Yükleniyor...</p>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page-shell flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link href={routes.home} className="inline-flex items-center space-x-3 mb-8">
            <div className="w-12 h-12 theme-logo-gradient rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">AF</span>
            </div>
            <span className="text-3xl font-bold text-gray-900">Cam Sanat Merkezi</span>
          </Link>
          <h2 className="text-3xl font-bold text-gray-900">Şifre Sıfırlama</h2>
          <p className="mt-2 text-sm text-gray-600">
            Yeni şifrenizi belirleyin
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Şifre
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern"
                placeholder="En az 6 karakter"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Şifre Tekrar
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-modern"
                placeholder="Şifrenizi tekrar girin"
                minLength={8}
              />
            </div>

            <Button
              type="submit"
              disabled={loading || !token}
              className="w-full btn-primary"
            >
              {loading ? "Sıfırlanıyor..." : "Şifreyi Sıfırla"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href={routes.login} className="text-sm text-primary hover:text-primary-dark">
              ← Giriş sayfasına dön
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="auth-page-shell flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <Card className="p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Yükleniyor...</p>
            </div>
          </Card>
        </div>
      </main>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

