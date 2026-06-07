import { NextResponse } from "next/server";

/**
 * /en/about → dahili /about + locale=en çerezi
 * TR Türkçe URL'ler next.config rewrite ile kalır
 */
export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") || pathname.startsWith("/api") || pathname.startsWith("/uploads")) {
    return NextResponse.next();
  }

  if (pathname === "/en" || pathname.startsWith("/en/")) {
    const internalPath = pathname === "/en" ? "/" : pathname.replace(/^\/en/, "") || "/";
    const url = request.nextUrl.clone();
    url.pathname = internalPath;
    const response = NextResponse.rewrite(url);
    response.cookies.set("locale", "en", { path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  }

  const response = NextResponse.next();
  const current = request.cookies.get("locale")?.value;
  if (!current || current === "en") {
    response.cookies.set("locale", "tr", { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"]
};
