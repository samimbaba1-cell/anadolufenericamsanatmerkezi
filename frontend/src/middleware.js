import { NextResponse } from "next/server";

/** Çift encode veya bozuk slug path'lerini düzelt */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/categories/")) {
    const segment = pathname.slice("/categories/".length).split("/")[0];
    if (!segment) return NextResponse.next();

    try {
      const decoded = decodeURIComponent(segment);
      if (decoded !== segment) {
        const url = request.nextUrl.clone();
        url.pathname = `/categories/${decoded}`;
        return NextResponse.redirect(url, 308);
      }
    } catch {
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/categories/:path*"]
};
