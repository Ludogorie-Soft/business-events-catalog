import type { NextAuthConfig } from "next-auth";

/**
 * Lightweight auth config used by middleware (Edge Runtime).
 * Must NOT import Prisma or any Node.js-only modules.
 */
export const authConfig: NextAuthConfig = {
  // Required on Vercel / behind proxies so Auth.js trusts the Host header.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const pathname = nextUrl.pathname;

      if (pathname.startsWith("/admin")) {
        if (!isLoggedIn) return false;
        return auth?.user?.role === "ADMIN";
      }

      if (pathname.startsWith("/profile")) {
        return isLoggedIn;
      }

      return true;
    },
  },
};
