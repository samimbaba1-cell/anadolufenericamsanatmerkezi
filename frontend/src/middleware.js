import { NextResponse } from "next/server";

/**
 * Eski Türkçe slug URL'leri (/categories/bileklikler) uygulama içinde
 * [slug] sayfasında ?category=id'ye yönlendirilir; burada sadece decode edilmiş path geçer.
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/categories/") && pathname !== "/categories/") {
    const segment = pathname.slice("/categories/".length).split("/")[0];
    if (segment && segment !== "page") {
      try {
        const decoded = decodeURIComponent(segment);
        if (decoded !== segment) {
          const url = request.nextUrl.clone();
          url.pathname = `/categories/${decoded}`;
          return NextResponse.redirect(url);
        }
      } catch {
        /* geçersiz encoding — sayfa kendi halleder */
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/categories/:path*"]
};
