import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

// Everything under /admin and /api/admin needs a valid login cookie.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Pages for logging in and resetting a forgotten password are open to everyone.
  if (pathname === "/admin/login" || pathname === "/admin/forgot" || pathname === "/admin/reset") return NextResponse.next();

  if (await verifyToken(req.cookies.get(COOKIE)?.value)) {
    const res = NextResponse.next();
    // Admin data must never come from a browser or CDN cache (e.g. a post list still showing "Published").
    if (pathname.startsWith("/api/")) res.headers.set("Cache-Control", "private, no-store");
    return res;
  }

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
