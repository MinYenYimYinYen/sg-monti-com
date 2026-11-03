import {
  QboCallbackResult,
  QboConnectionDoc,
  QboConnectionStatus,
  QboEnvironment,
  QboOAuthStateDoc,
} from "@/app/qbo/connection/types/QboConnectionTypes";
import {
  OAuthStateEvaluation,
  QboTokenResponseRaw,
  QboTokenSet,
} from "@/app/qbo/_lib/auth/qboOAuthTypes";

// Endpoints come from Intuit's discovery document
// (https://developer.api.intuit.com/.well-known/openid_configuration). The sandbox
// document lists the same OAuth endpoints, so only client keys and the accounting API
// base URL differ between sandbox and production.
export const QBO_OAUTH = {
  AUTHORIZE_URL: "https://appcenter.intuit.com/connect/oauth2",
  TOKEN_URL: "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer",
  REVOKE_URL: "https://developer.api.intuit.com/v2/oauth2/tokens/revoke",
} as const;

export const QBO_ACCOUNTING_SCOPE = "com.intuit.quickbooks.accounting";

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

// Intuit returns x_refresh_token_expires_in. This only applies if it is ever missing;
// it errs short so the reconnect warning appears early rather than late.
const FALLBACK_REFRESH_TOKEN_MS = 90 * 24 * 60 * 60 * 1000;

export const QBO_CONNECTION_PAGE_PATH = "/qbo/connection";

export function parseQboEnvironment(value: string | undefined): QboEnvironment | null {
  const normalized = value?.trim().toLowerCase();
  return normalized === "sandbox" || normalized === "production" ? normalized : null;
}

/** Returns a human-readable problem, or null when the redirect URI is acceptable. */
export function validateRedirectUri({
  redirectUri,
  environment,
}: {
  redirectUri: string;
  environment: QboEnvironment;
}): string | null {
  let url: URL;
  try {
    url = new URL(redirectUri);
  } catch {
    return "QBO_REDIRECT_URI is not a valid URL.";
  }
  // Intuit only allows plain http://localhost with sandbox keys.
  if (environment === "production" && url.protocol !== "https:") {
    return "QBO_REDIRECT_URI must use https when QBO_ENVIRONMENT is production. Intuit only allows http://localhost with sandbox keys.";
  }
  return null;
}

export function buildAuthorizeUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(QBO_OAUTH.AUTHORIZE_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", QBO_ACCOUNTING_SCOPE);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

export function buildBasicAuthHeader({
  clientId,
  clientSecret,
}: {
  clientId: string;
  clientSecret: string;
}): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

export function addMsToIso({ now, ms }: { now: Date; ms: number }): string {
  return new Date(now.getTime() + ms).toISOString();
}

/** An unparseable date counts as expiring, so a bad value forces a refresh rather than a stale call. */
export function isExpiringSoon({
  expiresAt,
  now,
  marginMs,
}: {
  expiresAt: string;
  now: Date;
  marginMs: number;
}): boolean {
  const expiresMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresMs)) return true;
  return expiresMs - now.getTime() <= marginMs;
}

/** QuickBooks company IDs are numeric strings. Rejecting anything else keeps junk out of the database. */
export function isValidRealmId(realmId: string): boolean {
  return /^\d{1,32}$/.test(realmId);
}

export function evaluateOAuthState({
  stateDoc,
  now,
}: {
  stateDoc: Pick<QboOAuthStateDoc, "userName" | "expiresAt"> | null;
  now: Date;
}): OAuthStateEvaluation {
  if (!stateDoc) return { ok: false, reason: "invalid_state" };
  const expiresMs = Date.parse(stateDoc.expiresAt);
  if (Number.isNaN(expiresMs) || expiresMs <= now.getTime()) {
    return { ok: false, reason: "expired_state" };
  }
  return { ok: true, userName: stateDoc.userName };
}

function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

/** Throws a generic error on a malformed response. The body is never included in the message. */
export function parseTokenResponse({
  body,
  now,
}: {
  body: QboTokenResponseRaw | null;
  now: Date;
}): QboTokenSet {
  const accessToken = body?.access_token;
  const refreshToken = body?.refresh_token;
  const accessSeconds = readPositiveNumber(body?.expires_in);
  if (
    typeof accessToken !== "string" ||
    !accessToken ||
    typeof refreshToken !== "string" ||
    !refreshToken ||
    accessSeconds === null
  ) {
    throw new Error("Unexpected token response from Intuit.");
  }
  const refreshSeconds = readPositiveNumber(body?.x_refresh_token_expires_in);
  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt: addMsToIso({ now, ms: accessSeconds * 1000 }),
    refreshTokenExpiresAt: addMsToIso({
      now,
      ms: refreshSeconds === null ? FALLBACK_REFRESH_TOKEN_MS : refreshSeconds * 1000,
    }),
  };
}

export function buildConnectionStatus({
  doc,
  configuredEnvironment,
  configProblem,
}: {
  doc: QboConnectionDoc | null;
  configuredEnvironment: QboEnvironment | null;
  configProblem: string | null;
}): QboConnectionStatus {
  if (!doc) {
    return {
      phase: "notConnected",
      configProblem,
      configuredEnvironment,
      connectedEnvironment: null,
      environmentMismatch: false,
      realmId: null,
      connectedByUserName: null,
      connectedAt: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
    };
  }
  const isConnected = doc.status === "connected";
  return {
    phase: isConnected ? "connected" : "reconnectRequired",
    configProblem,
    configuredEnvironment,
    connectedEnvironment: doc.environment,
    environmentMismatch: configuredEnvironment !== null && doc.environment !== configuredEnvironment,
    realmId: doc.realmId,
    connectedByUserName: doc.connectedByUserName,
    connectedAt: doc.connectedAt,
    accessTokenExpiresAt: isConnected ? doc.accessTokenExpiresAt : null,
    refreshTokenExpiresAt: isConnected ? doc.refreshTokenExpiresAt : null,
  };
}

/** Relative on purpose: the callback always runs on the same host as the admin page. */
export function buildConnectionPageUrl(result: QboCallbackResult): string {
  if (result.result === "connected") {
    return `${QBO_CONNECTION_PAGE_PATH}?qbo=connected`;
  }
  return `${QBO_CONNECTION_PAGE_PATH}?qbo=error&reason=${result.reason}`;
}
