import {
  QboConnectionDoc,
  QboEnvironment,
} from "@/app/qbo/connection/types/QboConnectionTypes";
import { isExpiringSoon } from "@/app/qbo/_lib/auth/qboOAuthUtils";
import { qboConst } from "@/app/qbo/_lib/qboConst";

// Pure decisions about the stored tokens. No database, network or clock access, so the
// refresh rules can be tested without any of them.

export type TokenAccessFailure =
  | "reconnectRequired"
  | "environmentMismatch"
  | "refreshTokenExpired";

export type TokenAccessDecision =
  | { action: "use" }
  | { action: "refresh" }
  | { action: "fail"; reason: TokenAccessFailure };

/**
 * `mustRefresh` is set after QuickBooks rejected the current access token with a 401. Normal
 * calls refresh only when the access token is close to expiring.
 */
export function evaluateTokenAccess({
  doc,
  now,
  configuredEnvironment,
  mustRefresh,
}: {
  doc: QboConnectionDoc;
  now: Date;
  configuredEnvironment: QboEnvironment;
  mustRefresh: boolean;
}): TokenAccessDecision {
  if (doc.status !== "connected") return { action: "fail", reason: "reconnectRequired" };
  // Dev and production share one database. Tokens issued for one environment must never
  // be sent to the other's API.
  if (doc.environment !== configuredEnvironment) {
    return { action: "fail", reason: "environmentMismatch" };
  }
  if (isExpiringSoon({ expiresAt: doc.refreshTokenExpiresAt, now, marginMs: 0 })) {
    return { action: "fail", reason: "refreshTokenExpired" };
  }
  const accessTokenNearExpiry = isExpiringSoon({
    expiresAt: doc.accessTokenExpiresAt,
    now,
    marginMs: qboConst.accessTokenRefreshMarginMs,
  });
  return mustRefresh || accessTokenNearExpiry ? { action: "refresh" } : { action: "use" };
}

/**
 * `revoked` (invalid_grant) is final: the grant is gone and only a reconnect fixes it.
 * `transient` is worth trying again later. `rejected` is anything else, such as bad client
 * credentials, and must not clear a connection that may still be valid.
 */
export type RefreshFailureKind = "revoked" | "transient" | "rejected";

export function classifyRefreshFailure({
  status,
  errorCode,
}: {
  status: number;
  errorCode: string | null;
}): RefreshFailureKind {
  if (errorCode === "invalid_grant") return "revoked";
  if (status === 429 || status >= 500) return "transient";
  return "rejected";
}
