"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { usePathname, useRouter } from "next/navigation";
import tr from "../messages/tr.json";
import en from "../messages/en.json";
import {
  getStoreRoutes,
  localizedPathFromPathname,
  categoryPath,
  productPath,
  orderPath,
  searchPath
} from "../lib/storeRoutes";

const MESSAGES = { tr, en };
const COOKIE_NAME = "locale";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const LocaleContext = createContext(null);

function readCookieLocale() {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=(tr|en)(?:;|$)`));
  return m?.[1] || null;
}

function writeCookieLocale(locale) {
  document.cookie = `${COOKIE_NAME}=${locale};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
}

function localeFromPathname(pathname) {
  return pathname?.startsWith("/en") ? "en" : "tr";
}

export function LocaleProvider({ children, initialLocale = "tr" }) {
  const router = useRouter();
  const pathname = usePathname();
  const pathLocale = localeFromPathname(pathname);
  const [locale, setLocaleState] = useState(pathLocale || initialLocale);

  useEffect(() => {
    const next = localeFromPathname(pathname);
    setLocaleState(next);
    writeCookieLocale(next);
    document.documentElement.lang = next;
  }, [pathname]);

  const setLocale = useCallback(
    (nextLocale) => {
      if (nextLocale !== "tr" && nextLocale !== "en") return;
      writeCookieLocale(nextLocale);
      document.documentElement.lang = nextLocale;
      setLocaleState(nextLocale);
      const target = localizedPathFromPathname(pathname || "/", nextLocale);
      if (target !== pathname) {
        router.push(target);
      }
    },
    [pathname, router]
  );

  const t = useCallback(
    (key, vars) => {
      const parts = String(key).split(".");
      let node = MESSAGES[locale] || MESSAGES.tr;
      for (const part of parts) {
        node = node?.[part];
      }
      if (node === undefined) {
        node = MESSAGES.tr;
        for (const part of parts) {
          node = node?.[part];
        }
      }
      let text = node ?? key;
      if (vars && typeof text === "string") {
        Object.entries(vars).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    [locale]
  );

  const routes = useMemo(() => getStoreRoutes(locale), [locale]);

  const paths = useMemo(
    () => ({
      product: (id) => productPath(id, locale),
      category: (slug) => categoryPath(slug, locale),
      order: (id) => orderPath(id, locale),
      search: (q) => searchPath(q, locale)
    }),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, routes, paths }),
    [locale, setLocale, t, routes, paths]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Sadece çeviri — provider dışında güvenli fallback */
export function useT() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return (key) => {
      const parts = String(key).split(".");
      let node = MESSAGES.tr;
      for (const part of parts) {
        node = node?.[part];
      }
      return node ?? key;
    };
  }
  return ctx.t;
}
