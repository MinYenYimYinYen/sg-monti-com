import { Role } from "@/lib/api/types/roles";
import { AppError } from "@/lib/errors/AppError";

/**
 * todo: Complete this after routes are standardized.
 * MOCK ASSERTION
 * Temporary placeholder until we implement NextAuth.
 * Currently acts as if a Super Admin is logged in.
 */
export async function assertRole(allowedRoles: Role[]) {
  // 1. Allow Public Access immediately
  if (allowedRoles.includes("public")) {
    return;
  }

  // 2. MOCK USER (The "Ghost" in the machine)
  // Change this to 'tech' or 'office' to test permission failures!
  const mockUserRole: Role = "admin";

  console.log(
    `[MockAuth] Checking Access. Required: [${allowedRoles}], User has: '${mockUserRole}'`,
  );

  // 3. Simple Check
  if (!allowedRoles.includes(mockUserRole)) {
    console.error(
      `[MockAuth] ⛔ DENIED. User '${mockUserRole}' needs [${allowedRoles}]`,
    );

    // We throw the real AppError so the API Route handles it correctly
    throw new AppError({
      message: `Access Denied (Mock). Required: [${allowedRoles.join(", ")}]`,
      type: "AUTH_ERROR",
      statusCode: 403,
    });
  }

  console.log(`[MockAuth] ✅ ACCESS GRANTED`);
}
