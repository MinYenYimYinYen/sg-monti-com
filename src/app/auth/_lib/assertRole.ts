import { Role } from "@/lib/api/types/roles";
import { AppError } from "@/lib/errors/AppError";
import { headers, cookies } from "next/headers";
import { verifyAccessToken } from "@/app/auth/_lib/tokenUtils";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";

export async function assertRole(allowedRoles: Role[]) {
  // 1. Allow Public Access immediately
  if (allowedRoles.includes("public")) {
    return;
  }

  let userRole: string | undefined;

  // 2. Try to get role from Headers (set by Proxy)
  // This is the "Defense in Depth" optimization
  const headerStore = await headers();
  const headerRole = headerStore.get("x-user-role");

  if (headerRole) {
    userRole = headerRole;
  } else {
    // 3. Fallback: Verify Token from Cookie
    // Useful for local dev or if Proxy is bypassed/misconfigured
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_CONST.COOKIE.ACCESS_TOKEN)?.value;

    if (!token) {
      throw new AppError({
        message: "Authentication required",
        type: "AUTH_ERROR",
        statusCode: 401,
      });
    }

    try {
      const payload = verifyAccessToken(token);
      userRole = payload.role;
    } catch (e) {
      throw new AppError({
        message: "Invalid token",
        type: "AUTH_ERROR",
        statusCode: 401,
        data: e,
      });
    }
  }

  // 4. Check Permission
  if (!userRole || !allowedRoles.includes(userRole as Role)) {
    throw new AppError({
      message: `Access Denied. Required: [${allowedRoles.join(", ")}]`,
      type: "AUTH_ERROR",
      statusCode: 403,
    });
  }
}
