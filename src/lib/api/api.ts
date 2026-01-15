import { ErrorResponse } from "@/lib/api/types/responses";
import { AppError, ErrorType } from "@/lib/errors/AppError";

// 1. EXTEND RequestInit
// We "unlock" the body type so you can pass OpMaps or other objects
interface ApiConfig extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function api<T>(url: string, config: ApiConfig = {}) {
  const { body, headers, ...rest } = config;

  try {
    const res = await fetch(url, {
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
    });

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
