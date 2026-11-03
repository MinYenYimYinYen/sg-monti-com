import { AppError } from "@/lib/errors/AppError";
import { QboConfig, QboTokenResponseRaw, QboTokenSet } from "@/app/qbo/_lib/auth/qboOAuthTypes";
import {
  QBO_OAUTH,
  buildBasicAuthHeader,
  parseTokenResponse,
} from "@/app/qbo/_lib/auth/qboOAuthUtils";

// Server only. Calls Intuit's OAuth endpoints. Request and response bodies carry codes and
// tokens, so they are never logged or put in an error message. Only the HTTP status and
// Intuit's `intuit_tid` reference are, so a failure can be quoted to Intuit support.
const REQUEST_TIMEOUT_MS = 15_000;

export async function exchangeCodeForTokens({
  code,
  config,
}: {
  code: string;
  config: QboConfig;
}): Promise<QboTokenSet> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.redirectUri,
  });

  let res: Response;
  try {
    res = await fetch(QBO_OAUTH.TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(config),
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new AppError({
      message: "Could not reach Intuit to complete the connection.",
      type: "NETWORK_ERROR",
      statusCode: 0,
      isOperational: true,
    });
  }

  const intuitTid = res.headers.get("intuit_tid");
  if (!res.ok) {
    console.warn(
      `[QBO] Token exchange failed: HTTP ${res.status}, intuit_tid ${intuitTid ?? "none"}`,
    );
    throw new AppError({
      message: `Intuit rejected the connection request (HTTP ${res.status}, reference ${intuitTid ?? "none"}).`,
      type: "EXTERNAL_ERROR",
      statusCode: res.status,
      isOperational: true,
      data: { intuitTid },
    });
  }

  const json = (await res.json().catch(() => null)) as QboTokenResponseRaw | null;
  return parseTokenResponse({ body: json, now: new Date() });
}

/** Never throws. Returns whether Intuit confirmed the revocation. */
export async function revokeToken({
  token,
  config,
}: {
  token: string;
  config: QboConfig;
}): Promise<boolean> {
  try {
    const res = await fetch(QBO_OAUTH.REVOKE_URL, {
      method: "POST",
      headers: {
        Authorization: buildBasicAuthHeader(config),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ token }),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(
        `[QBO] Token revocation failed: HTTP ${res.status}, intuit_tid ${res.headers.get("intuit_tid") ?? "none"}`,
      );
      return false;
    }
    return true;
  } catch {
    console.warn("[QBO] Token revocation request could not be sent.");
    return false;
  }
}
