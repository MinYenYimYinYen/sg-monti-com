// src/lib/api/rgHttp.ts
import { AsyncLocalStorage } from "async_hooks";
import { trimStringValues } from "@/lib/primatives/string/trimStringValues";
import { AppError } from "@/lib/errors/AppError";

export const realGreenBaseUrl = "https://saapi.realgreen.com";
const rgApiKey = process.env.RGAPI_KEY;

/**
 * Request-scoped call accumulator using AsyncLocalStorage.
 *
 * Each operation that wants logging calls rgCallMapStorage.run(new Map(), async () => { ... }).
 * All rgHttp calls within that async context automatically write to that operation's private Map.
 * Concurrent operations are fully isolated — no bleed between requests, even in dev mode.
 *
 * If no store is active (e.g., a call from outside a logging context), rgHttp silently skips
 * accumulation. This makes logging opt-in without requiring changes to call sites.
 */
export const rgCallMapStorage = new AsyncLocalStorage<Map<string, number>>();

export async function rgHttp<T>(endpoint: string, config: RequestInit = {}, pathTemplate?: string) {
  const { body, headers, ...rest } = config;
  const url = `${realGreenBaseUrl}${endpoint}`;

  // Accumulate into the current operation's call map, if one is active.
  const callMap = rgCallMapStorage.getStore();
  if (callMap) {
    const key = pathTemplate ?? endpoint;
    callMap.set(key, (callMap.get(key) ?? 0) + 1);
  }

  try {
    const res = await fetch(url, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        apiKey: rgApiKey || "",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      // RealGreen usually returns { message: string, ... }
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.message || `RealGreen Error: ${res.statusText}`;

      // Throw explicit external error
      throw new AppError({
        message,
        type: "EXTERNAL_ERROR", // Distinct from your internal API
        statusCode: res.status,
        isOperational: true,
        data: errorData,
      });
    }

    let data = await res.json();

    // The "Interceptor" Logic
    if (data) {
      data = trimStringValues(data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof AppError) throw error;

    throw new AppError({
      message: "Failed to connect to RealGreen",
      type: "NETWORK_ERROR",
      statusCode: 0,
      isOperational: true,
      data: error,
    });
  }
}
