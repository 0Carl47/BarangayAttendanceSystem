import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySession } from "@/lib/auth";

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const path = url.pathname;

  const protectedPaths = ["/admin", "/employee", "/reports", "/fingerprint"];
  const isProtected = protectedPaths.some((p) => path === p || path.startsWith(p + "/"));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("session")?.value || "";
  const session = token ? await verifySession(token) : null;

  if (!session) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/admin") && session.role !== "admin") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (path.startsWith("/employee") && session.role !== "employee") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Fingerprint management: admin only
  if (path.startsWith("/fingerprint") && session.role !== "admin") {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/employee/:path*", "/reports/:path*", "/fingerprint/:path*"],
};
