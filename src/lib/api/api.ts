import { ErrorResponse } from "@/lib/api/types/responses";
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
  // Only attempt refresh if we are NOT currently hitting the auth endpoint (prevents loops)
  if (url.includes("/auth/api")) {
    return null;
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

export async function api<T>(url: string, config: ApiConfig = {}) {
  const { body, headers, ...rest } = config;

  const fetchConfig = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    // 2. Auto-stringify
    body:
      body && typeof body === "object"
        ? JSON.stringify(body)
        : (body as BodyInit),
  };

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

    if (!res.ok) {
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

      // 3. THROW WITH OBJECT
      throw new AppError({
        message,
        type,
        statusCode: res.status,
        isOperational: true,
        data: errorData.data,
        silent,
      });
    }

    if (res.status === 204) return null as T;
    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof AppError) throw error;

    // 4. Catch Network Errors
    throw new AppError({
      message: error instanceof Error ? error.message : "Network error",
      type: "NETWORK_ERROR",
      statusCode: 0,
      isOperational: true,
    });
  }
}
