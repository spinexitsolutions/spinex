import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifyToken } from "@/lib/auth";

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*"] };

// Everything under /admin and /api/admin needs a valid login cookie.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  // Pages for logging in and resetting a forgotten password are open to everyone.
  if (pathname === "/admin/login" || pathname === "/admin/forgot" || pathname === "/admin/reset") return NextResponse.next();

  if (await verifyToken(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}
