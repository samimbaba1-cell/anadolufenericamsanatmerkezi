import { Geist, Geist_Mono, Inter, Poppins, Roboto, Open_Sans, Lato, Montserrat } from "next/font/google";
import "./globals.css";
import { SiteSettingsProvider } from "../context/SiteSettingsContext";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { ToastProvider } from "../context/ToastContext";
import GoogleAnalytics from "../components/GoogleAnalytics";
import Newsletter from "../components/Newsletter";
import LiveChat from "../components/LiveChat";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

const openSans = Open_Sans({
  variable: "--font-opensans",
  subsets: ["latin"],
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

export const metadata = {
  title: "Anadolu Feneri Cam Sanat Merkezi",
  description: "Anadolu Feneri Cam Sanat Merkezi - El yapımı cam sanat eserleri ve özgün dekoratif ürünler",
};

export default function RootLayout({ children }) {
  return (
    <html lang="tr">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="dns-prefetch" href="//fonts.gstatic.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${poppins.variable} ${roboto.variable} ${openSans.variable} ${lato.variable} ${montserrat.variable} antialiased`}
      >
        <GoogleAnalytics />
        <a href="#main-content" className="skip-link">
          Ana içeriğe geç
        </a>
        <SiteSettingsProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <ToastProvider>
                  <Header />
                  <main id="main-content" className="min-h-[calc(100vh-120px)]">
                    {children}
                  </main>
                  <Footer />
                  <Newsletter />
                  <LiveChat />
                </ToastProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </SiteSettingsProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      // Service Worker registered
                    })
                    .catch(function(registrationError) {
                      // Service Worker registration failed
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
