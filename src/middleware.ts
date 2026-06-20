import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Protect /admin routes — must be ADMIN
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(
        new URL(`/auth/login?callbackUrl=${pathname}`, req.url)
      );
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect /profile routes — must be logged in
  if (pathname.startsWith("/profile")) {
    if (!session) {
      return NextResponse.redirect(
        new URL(`/auth/login?callbackUrl=${pathname}`, req.url)
      );
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*"],
};
