import { DataResponse, ErrorResponse } from "@/lib/api/types/responses";
import { AppError, ErrorType } from "@/lib/errors/AppError";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { AuthContract } from "@/app/auth/_types/AuthContract";

// 1. EXTEND RequestInit
// We "unlock" the body type so you can pass OpMaps or other objects
interface ApiConfig extends Omit<RequestInit, "body"> {
  body?: unknown;
}

// --- JWT DECODE UTILITY ---
/**
 * Decodes a JWT token WITHOUT verification to extract the expiration time.
 * Used to check if a token is about to expire before making a request.
 * Returns null if the token is invalid or cannot be decoded.
 */
function decodeJwtExpiration(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return payload.exp || null;
  } catch {
    return null;
  }
}

/**
 * Gets the access token from document.cookie.
 * Returns null if not found.
 */
function getAccessTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split("; ");
  const tokenCookie = cookies.find((c) => c.startsWith("sg_access_token="));
  if (!tokenCookie) return null;

  return tokenCookie.split("=")[1] || null;
}

// --- MUTEX FOR REFRESH ---
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Proactively refreshes the access token if it's expiring within the threshold.
 * This prevents 401 errors by ensuring the token is valid before making requests.
 *
 * @param thresholdSeconds - Refresh if token expires within this many seconds (default: 120)
 */
async function ensureValidToken(thresholdSeconds: number = 120): Promise<void> {
  // Skip if we're already refreshing
  if (isRefreshing && refreshPromise) {
    await refreshPromise;
    return;
  }

  const token = getAccessTokenFromCookie();
  if (!token) return; // No token means public request or logged out

  const exp = decodeJwtExpiration(token);
  if (!exp) return; // Cannot decode token, let the request proceed (will fail if invalid)

  const nowInSeconds = Math.floor(Date.now() / 1000);
  const timeUntilExpiry = exp - nowInSeconds;

  // If token is expiring soon (or already expired), refresh it
  if (timeUntilExpiry < thresholdSeconds) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = (async () => {
        try {
          const refreshBody: OpMap<AuthContract> = { op: "refresh" };
          const refreshRes = await fetch("/auth/api", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(refreshBody),
          });
          return refreshRes.ok;
        } catch (e) {
          return false;
        } finally {
          isRefreshing = false;
          refreshPromise = null;
        }
      })();
    }

    await refreshPromise;
  }
}

/**
 * Handles the 401 Refresh Token flow with a Mutex to prevent parallel refreshes.
 * Returns the new Response if retry succeeds, or null if refresh failed/not needed.
 */
async function handleRefreshAndRetry(
  url: string,
  fetchConfig: RequestInit,
): Promise<Response | null> {
  // 1. Prevent Infinite Loops
  // We must allow /auth/api calls to refresh (e.g., changePassword, checkAuth),
  // but we must NOT allow the 'refresh' op itself to trigger a refresh loop.
  if (url.includes("/auth/api")) {
    try {
      if (typeof fetchConfig.body === "string") {
        const body = JSON.parse(fetchConfig.body);
        if (body.op === "refresh") {
          return null;
        }
      }
    } catch {
      // If body isn't JSON, it's likely not our RPC, so proceed with caution or ignore.
      // For now, we assume if we can't parse it, it's not a refresh op.
    }
  }

  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = (async () => {
      try {
        const refreshBody: OpMap<AuthContract> = { op: "refresh" };
        const refreshRes = await fetch("/auth/api", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(refreshBody),
        });
        return refreshRes.ok;
      } catch (e) {
        return false;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    })();
  }

  // Wait for the refresh to finish (whether we started it or someone else did)
  const refreshSuccess = await refreshPromise;

  if (refreshSuccess) {
    // Retry the original request
    return await fetch(url, fetchConfig);
  }

  return null;
}

function prepareFetchConfig(config: ApiConfig): RequestInit {
  const { body, headers, ...rest } = config;

  return {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    // Auto-stringify
    body:
      body && typeof body === "object"
        ? JSON.stringify(body)
        : (body as BodyInit),
  };
}

async function fetchWithRetry(
  url: string,
  fetchConfig: RequestInit,
): Promise<Response> {
  try {
    let res = await fetch(url, fetchConfig);

    // --- RETRY LOGIC (401) ---
    if (res.status === 401) {
      const retryRes = await handleRefreshAndRetry(url, fetchConfig);
      if (retryRes) {
        res = retryRes;
      }
    }
    // --- END RETRY LOGIC ---

    return res;
  } catch (error) {
    // Catch Network Errors
    throw new AppError({
      message: error instanceof Error ? error.message : "Network error",
      type: "NETWORK_ERROR",
      statusCode: 0,
      isOperational: true,
    });
  }
}

/**
 * Parses the response body. If it's a structured ErrorResponse, returns it.
 * If it's an unstructured error (e.g. HTML 500), throws AppError.
 */
async function parseOrThrow(res: Response): Promise<any> {
  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    // JSON Parse Failed -> Likely HTML Error Page (Nginx/Next.js default)
    throw new AppError({
      message: res.statusText || "Server Error (Invalid JSON)",
      type: "SERVER_ERROR",
      statusCode: res.status,
      isOperational: false,
    });
  }

  // If it's a structured error (success: false), return it as data
  if (data && typeof data === "object" && data.success === false) {
    return data as ErrorResponse;
  }

  // If status is bad but no structured error, throw
  if (!res.ok) {
    throw new AppError({
      message: data?.message || res.statusText || "Request failed",
      type: "API_ERROR",
      statusCode: res.status,
      isOperational: true,
      data: data,
    });
  }

  return data;
}

export async function api<T>(
  url: string,
  config: ApiConfig = {},
): Promise<T | ErrorResponse> {
  // Proactively refresh token if expiring soon (prevents 401 errors)
  await ensureValidToken();

  const fetchConfig = prepareFetchConfig(config);
  const res = await fetchWithRetry(url, fetchConfig);

  if (res.status === 204) return null as T;

  // This will return T (success) OR ErrorResponse (failure)
  // Or throw if it's a network/unstructured error
  return await parseOrThrow(res);
}

export async function apiStream(
  url: string,
  config: ApiConfig = {},
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  // Proactively refresh token if expiring soon (prevents 401 errors)
  await ensureValidToken();

  const fetchConfig = prepareFetchConfig(config);
  const res = await fetchWithRetry(url, fetchConfig);

  if (!res.ok) {
    // For streams, we can't easily return a JSON error object since the return type is a Reader.
    // So we must throw here.
    await parseOrThrow(res); // This will throw
  }

  if (!res.body) {
    throw new AppError({
      message: "Response body is empty",
      type: "API_ERROR",
      statusCode: res.status,
    });
  }

  return res.body.getReader();
}
