import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export default async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  // Protect /admin — must be logged in and ADMIN role
  if (pathname.startsWith("/admin")) {
    if (!token) {
      return NextResponse.redirect(
        new URL(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      );
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect /profile — must be logged in
  if (pathname.startsWith("/profile")) {
    if (!token) {
      return NextResponse.redirect(
        new URL(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`, req.url)
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
