/**
 * Mağaza sayfa yolları — varsayılan TR (Türkçe SEO URL).
 * Çok dilli linkler için `useLocale().routes` veya `getStoreRoutes(locale)` kullanın.
 */
import { routes as trRoutes } from "./storeRoutes";

export {
  getStoreRoutes,
  categoryPath,
  productPath,
  orderPath,
  searchPath,
  localizedPathFromPathname,
  pathnameToInternal
} from "./storeRoutes";

/** Varsayılan mağaza rotaları (TR) + yönetim paneli */
export const routes = { ...trRoutes, admin: "/admin" };
