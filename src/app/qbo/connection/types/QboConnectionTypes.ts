import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type QboEnvironment = "sandbox" | "production";

/** `reconnectRequired` is set when Intuit reports the grant revoked or expired; tokens are then blank. */
export type QboStoredConnectionStatus = "connected" | "reconnectRequired";

/**
 * Storage shape of the single QuickBooks connection (one company, natural key realmId).
 * Tokens are encrypted at rest and never leave the server. `version` is bumped on every
 * token write so refreshes can use compare-and-swap (refresh tokens rotate).
 */
export type QboConnectionDoc = CreatedUpdated & {
  realmId: string;
  environment: QboEnvironment;
  status: QboStoredConnectionStatus;
  accessTokenEnc: string;
  refreshTokenEnc: string;
  accessTokenExpiresAt: string;
  refreshTokenExpiresAt: string;
  connectedByUserName: string;
  connectedAt: string;
  version: number;
};

/**
 * One-time CSRF state for the OAuth round trip. It also carries who started the
 * connection, because the callback arrives cross-site from Intuit and cannot rely on
 * the login cookies (they are SameSite=strict).
 */
export type QboOAuthStateDoc = CreatedUpdated & {
  state: string;
  userName: string;
  expiresAt: string;
};

export type QboConnectionPhase = "notConnected" | "connected" | "reconnectRequired";

/**
 * What the admin page may see. Contains no tokens. `configProblem` is set (and
 * `configuredEnvironment` may be null) when the server's QBO env vars are missing or invalid,
 * so the page can explain it instead of showing a blank screen.
 */
export type QboConnectionStatus = {
  phase: QboConnectionPhase;
  configProblem: string | null;
  configuredEnvironment: QboEnvironment | null;
  connectedEnvironment: QboEnvironment | null;
  environmentMismatch: boolean;
  realmId: string | null;
  connectedByUserName: string | null;
  connectedAt: string | null;
  accessTokenExpiresAt: string | null;
  refreshTokenExpiresAt: string | null;
};

/**
 * `revocationConfirmed` is false when we could not confirm with Intuit that the grant
 * was revoked. The local tokens are deleted either way, but the user should then remove
 * the app from the connected apps page in their Intuit account.
 */
export type QboDisconnectResult = {
  revocationConfirmed: boolean;
  status: QboConnectionStatus;
};

export const QBO_CALLBACK_FAILURE_REASONS = [
  "denied",
  "missing_params",
  "invalid_state",
  "expired_state",
  "other_company_connected",
  "exchange_failed",
  "server_error",
] as const;

export type QboCallbackFailureReason = (typeof QBO_CALLBACK_FAILURE_REASONS)[number];

export type QboCallbackResult =
  | { result: "connected" }
  | { result: "error"; reason: QboCallbackFailureReason };
