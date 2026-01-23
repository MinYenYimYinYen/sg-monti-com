import { DataResponse, ErrorResponse } from "@/lib/api/types/responses";
import { AppError, ErrorType } from "@/lib/errors/AppError";
import { OpMap } from "@/lib/api/types/rpcUtils";
import { AuthContract } from "@/app/auth/_types/AuthContract";

// 1. EXTEND RequestInit
// We "unlock" the body type so you can pass OpMaps or other objects
interface ApiConfig extends Omit<RequestInit, "body"> {
  body?: unknown;
}

// --- MUTEX FOR REFRESH ---
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

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

async function handleApiError(res: Response) {
  const errorData = (await res
    .json()
    .catch(() => ({}))) as Partial<ErrorResponse>;

  const message = errorData.message || res.statusText || "Request failed";
  const silent = errorData.silent ?? false;

  // Map Status Code to Error Type
  let type: ErrorType = "API_ERROR";
  if (res.status === 400) type = "VALIDATION_ERROR";
  if (res.status === 401 || res.status === 403) type = "AUTH_ERROR";
  if (res.status >= 500) type = "SERVER_ERROR";

  // THROW WITH OBJECT
  throw new AppError({
    message,
    type,
    statusCode: res.status,
    isOperational: true,
    data: errorData.data,
    silent,
  });
}

export async function api<T>(
  url: string,
  config: ApiConfig = {},
): Promise<T | ErrorResponse> {
  const fetchConfig = prepareFetchConfig(config);
  const res = await fetchWithRetry(url, fetchConfig);

  if (!res.ok) {
    await handleApiError(res);
  }

  if (res.status === 204) return null as T;

  // Return Data (Success or Handled Error)
  // We assume the caller will check .success if T includes it.
  return (await res.json()) as T | ErrorResponse;
}

export async function apiStream(
  url: string,
  config: ApiConfig = {},
): Promise<ReadableStreamDefaultReader<Uint8Array>> {
  const fetchConfig = prepareFetchConfig(config);
  const res = await fetchWithRetry(url, fetchConfig);

  if (!res.ok) {
    await handleApiError(res);
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
