import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, JWTPayload } from "jose";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

// Use the ACCESS secret for lightweight verification at the edge
const SECRET_KEY = process.env.AUTH_ACCESS_SECRET;
const ENCODED_SECRET = new TextEncoder().encode(SECRET_KEY);

// Define our custom payload type for better type safety
interface CustomJwtPayload extends JWTPayload {
  userId?: string;
  role?: string;
  saId?: string;
}

// -----------------------------------------------------------------------------
// Proxy Handler
// -----------------------------------------------------------------------------

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Check if the current path is public
  // We use Array.from because AUTH_CONST.PUBLIC_PATHS is readonly
  const isPublic = Array.from(AUTH_CONST.PUBLIC_PATHS).some((path) =>
    pathname.startsWith(path),
  );

  // 2. Token Retrieval
  // Matches the cookie name set in your Auth system
  const token = request.cookies.get(AUTH_CONST.COOKIE.ACCESS_TOKEN)?.value;

  // 3. Optimistic Token Verification
  let verifiedTokenPayload: CustomJwtPayload | null = null;

  if (token) {
    try {
      // jose works on Edge; jsonwebtoken does not.
      const { payload } = await jwtVerify(token, ENCODED_SECRET);
      verifiedTokenPayload = payload as CustomJwtPayload;
    } catch (error) {
      // Token expired or invalid. Proceed as unauthenticated.
    }
  }

  // 4. Scenario A: Unauthenticated User on Protected Route
  if (!isPublic && !verifiedTokenPayload) {
    const loginUrl = new URL("auth/login", request.url);

    // Save the original path so we can redirect them back after login
    // e.g., /login?from=/dashboard/settings
    loginUrl.searchParams.set("from", pathname);

    return NextResponse.redirect(loginUrl);
  }

  // 5. Scenario B: Authenticated User on Public Route (Login/Register)
  if (isPublic && verifiedTokenPayload && pathname !== "/auth/api") {
    // If they are already logged in, kick them to the dashboard/home
    return NextResponse.redirect(new URL("/", request.url));
  }

  // 6. Header Mutation (Optional but recommended)
  // Pass the user ID to the backend so Server Components don't have to re-verify immediately
  const requestHeaders = new Headers(request.headers);

  if (verifiedTokenPayload) {
    if (verifiedTokenPayload.userId) {
      requestHeaders.set("x-user-id", verifiedTokenPayload.userId);
    }
    if (verifiedTokenPayload.role) {
      requestHeaders.set("x-user-role", verifiedTokenPayload.role);
    }
  }

  // 7. Allow request to proceed
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

// -----------------------------------------------------------------------------
// Matcher Configuration
// -----------------------------------------------------------------------------

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
