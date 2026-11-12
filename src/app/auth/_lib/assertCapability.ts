import { cookies } from "next/headers";
import { verifyAccessToken } from "@/app/auth/_lib/tokenUtils";
import { AUTH_CONST } from "@/app/auth/_lib/authConst";
import { TokenPayload } from "@/app/auth/_types/authTypes";
import { capabilityLoaders } from "@/app/permission/_lib/capabilityLoaders";
import { AppError } from "@/lib/errors/AppError";
import { CapabilityRequirement } from "@/permission/PermissionTypes";
import { evaluateCapability } from "@/permission/evaluateCapability";

/**
 * Verifies the access cookie itself and never trusts identity headers (x-user-id, x-user-role),
 * which a client can send. Returns the verified token payload, or null for a public op with no
 * valid session. The database reads (superuser confirmation, the user's bundles and direct
 * grants) are in capabilityLoaders; the decision is evaluateCapability.
 */
export async function assertCapability(required: CapabilityRequirement): Promise<TokenPayload | null> {
  let payload: TokenPayload | null = null;

  const token = (await cookies()).get(AUTH_CONST.COOKIE.ACCESS_TOKEN)?.value;
  if (token) {
    try {
      payload = verifyAccessToken(token);
    } catch (e) {
      if (required !== "public") {
        throw new AppError({ message: "Invalid token", type: "AUTH_ERROR", statusCode: 401, data: e });
      }
    }
  }

  const decision = await evaluateCapability({ required, identity: payload, loaders: capabilityLoaders });
  if (decision === "unauthenticated") {
    throw new AppError({ message: "Authentication required", type: "AUTH_ERROR", statusCode: 401 });
  }
  if (decision === "forbidden") {
    throw new AppError({ message: `Access Denied. Required: ${required}`, type: "AUTH_ERROR", statusCode: 403 });
  }
  return payload;
}
