import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, JWTPayload } from "jose";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import { TokenPayload } from "@/app/auth/_types/authTypes";

// -----------------------------------------------------------------------------
// Configuration & Helpers
// -----------------------------------------------------------------------------

const SECRET_KEY = process.env.ACCESS_SECRET;
const ENCODED_SECRET = new TextEncoder().encode(SECRET_KEY);

interface CustomJwtPayload extends JWTPayload, TokenPayload {}

async function verifyToken(
  token: string | undefined,
): Promise<CustomJwtPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, ENCODED_SECRET);
    return payload as CustomJwtPayload;
  } catch {
    return null;
  }
}

function nextWithHeaders(request: NextRequest, user: CustomJwtPayload | null) {
  const requestHeaders = new Headers(request.headers);
  if (user) {
    if (user.saId) requestHeaders.set("x-user-id", user.saId);
    if (user.role) requestHeaders.set("x-user-role", user.role);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

// -----------------------------------------------------------------------------
// Main Proxy Logic
// -----------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. GATHER CONTEXT
  const token = request.cookies.get(AUTH_CONST.COOKIE.ACCESS_TOKEN)?.value;
  const user = await verifyToken(token);

  const isPublic = Array.from(AUTH_CONST.PUBLIC_PATHS).some((path) =>
    pathname.startsWith(path),
  );
  // Match ALL Next.js API routes (*/api or /api/*), not just /auth/api
  const isApi = pathname.includes("/api");
  const isStatic = pathname.startsWith("/_next") || pathname === "/favicon.ico";
  const isAppliedPage = pathname === "/auth/applied";
  const isChangePasswordPage = pathname === "/auth/changePassword";

  const isAuthenticated = !!user;
  const isAppliedUser = user?.role === "applied";
  const mustChangePassword = user?.mustChangePassword;

  // 2. LOGIC GATES (Order Matters!)

  // GATE A: Infrastructure (Always Allow)
  if (isApi || isStatic) {
    return nextWithHeaders(request, user);
  }

  // GATE B: The "Applied" Sandbox
  // If user is "applied", they are confined to the applied page.
  if (isAppliedUser) {
    if (isAppliedPage) return nextWithHeaders(request, user);
    return NextResponse.redirect(new URL("/auth/applied", request.url));
  }

  // GATE B.1: Force Password Change
  // If user must change password, they are confined to the change-password page.
  if (mustChangePassword) {
    if (isChangePasswordPage) return nextWithHeaders(request, user);
    return NextResponse.redirect(new URL("/auth/changePassword", request.url));
  }

  // GATE C: Protect the "Applied" Page
  // If user is NOT "applied" (Active or Guest), they cannot see this page.
  if (isAppliedPage) {
    const dest = isAuthenticated ? "/" : "/auth/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // GATE C.1: Protect the "Change Password" Page
  // If user does NOT need to change password, they shouldn't be here (unless we allow voluntary changes later)
  // For now, let's redirect them home if they try to access it manually but don't need to.
  if (isChangePasswordPage && !mustChangePassword) {
    const dest = isAuthenticated ? "/" : "/auth/login";
    return NextResponse.redirect(new URL(dest, request.url));
  }

  // GATE D: Standard Auth Protection
  // Guest trying to access a protected route -> Login
  if (!isAuthenticated && !isPublic) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // GATE E: Already Logged In
  // Active user trying to access a public route (Login/Register) -> Home
  if (isAuthenticated && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // GATE F: Default Pass-through
  return nextWithHeaders(request, user);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
