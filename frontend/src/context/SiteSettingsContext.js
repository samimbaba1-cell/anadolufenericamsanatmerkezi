"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLogoUrl } from "../lib/images";

const defaultSettings = {
  general: {
    siteName: "Anadolu Feneri Cam Sanat Merkezi",
    siteDescription: "Kaliteli ürünler, uygun fiyatlar ve hızlı teslimat",
    siteSlogan: "Kaliteli ürünler, güvenilir hizmet",
    logoUrl: "/images/logo-placeholder.png",
    faviconUrl: "/icons/icon-192.svg"
  },
  contact: {
    email: "info@anadolufenericamsanatmerkezi.com",
    phone: "+90 (212) 555-0123",
    address: "İstanbul, Türkiye",
    whatsapp: "",
    supportHours: "Hafta içi 09:00 - 18:00"
  },
  social: {
    facebook: "",
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: ""
  },
  seo: {
    metaTitle: "Anadolu Feneri Cam Sanat Merkezi - Online Alışveriş",
    metaDescription: "En kaliteli ürünleri uygun fiyatlarla bulun",
    keywords: "e-ticaret, online alışveriş, kaliteli ürünler"
  },
  analytics: {
    googleAnalyticsId: "",
    googleAnalyticsEnabled: false,
    facebookPixelId: "",
    facebookPixelEnabled: false,
    tawkToId: ""
  },
  shipping: {
    enableFreeShipping: true,
    freeShippingThreshold: 500,
    shippingCost: 25,
    shippingCompanies: ["Aras Kargo", "Yurtiçi Kargo", "MNG Kargo"],
    defaultShippingCompany: "Aras Kargo",
    estimatedDeliveryDays: 3
  },
  payment: {
    enableIyzico: true,
    enableCashOnDelivery: true,
    enableBankTransfer: false,
    bankAccounts: []
  },
  theme: {
    primaryColor: "#3B82F6",
    secondaryColor: "#8B5CF6",
    accentColor: "#F59E0B",
    backgroundColor: "#FFFFFF",
    surfaceColor: "#F8FAFC",
     successColor: "#10B981",
     warningColor: "#F59E0B",
     errorColor: "#EF4444",
     foregroundColor: "#0F172A",
     borderColor: "#E2E8F0",
    buttonRadius: 8,
    activePreset: "modern-blue",
    fontFamily: "inter",
    headingFont: "Inter",
    bodyFont: "Inter",
    layout: {
      headerStyle: "default",
      footerStyle: "default",
      sidebarPosition: "right",
      productGrid: "4-columns",
      cardStyle: "default",
      buttonStyle: "rounded",
      borderRadius: "medium",
      shadow: "medium"
    },
    layoutTokens: {
      headerHeight: "64px",
      footerHeight: "200px",
      maxWidth: "1280px",
      borderRadius: "8px",
      shadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)"
    },
    animations: {
      enableAnimations: true,
      animationSpeed: "normal",
      hoverEffects: true,
      pageTransitions: true,
      duration: "300ms",
      easing: "ease-in-out"
    }
  },
  features: {
    enableFreeShipping: true,
    freeShippingThreshold: 500
  },
  loading: true
};

const SiteSettingsContext = createContext(defaultSettings);

export function SiteSettingsProvider({ children }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchSettings() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/settings/public`, {
          cache: "no-store"
        });
        if (!mounted) return;
        if (res.ok) {
          const data = await res.json();
          const general = data.general || {};
          const theme = data.theme || {};
          setSettings(prev => ({
            ...prev,
            ...data,
            general: {
              ...prev.general,
              ...general,
              logoUrl: normalizeLogoUrl(general.logoUrl)
            },
            theme: {
              ...prev.theme,
              ...theme
            },
            shipping: {
              ...prev.shipping,
              ...(data.shipping || {})
            },
            payment: {
              ...prev.payment,
              ...(data.payment || {})
            },
            loading: false
          }));
        } else {
          setSettings(prev => ({ ...prev, loading: false }));
        }
      } catch (error) {
        console.error("Site settings fetch error:", error);
        if (mounted) {
          setSettings(prev => ({ ...prev, loading: false }));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo(() => ({
    ...settings,
    loading
  }), [settings, loading]);

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}

