import { ErrorResponse } from "@/lib/api/types/responses";
import { AppError } from "@/lib/errors/AppError";
import { RestConfig, RestResponse, RestApiInstance } from "./RestConfig";
import { buildUrl } from "./queryString";

/**
 * Prepares fetch configuration from RestConfig
 */
function prepareFetchConfig<TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(
  method: string,
  config: RestConfig<TParams, THeaders> = {},
): { url: string; fetchConfig: RequestInit } {
  const { baseURL, params, body, headers, ...rest } = config;

  // Build URL with query params
  const url = buildUrl("", baseURL, params as any);

  // Prepare headers
  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  // Prepare fetch config
  const fetchConfig: RequestInit = {
    method,
    headers: finalHeaders,
    ...rest,
  };

  // Auto-stringify body if present
  if (body !== undefined) {
    fetchConfig.body =
      typeof body === "object" ? JSON.stringify(body) : (body as BodyInit);
  }

  return { url, fetchConfig };
}

/**
 * Parses the response body. If it's a structured ErrorResponse, returns it.
 * If it's an unstructured error (e.g. HTML 500), throws AppError.
 */
async function parseOrThrow(res: Response): Promise<any> {
  // Handle 204 No Content
  if (res.status === 204) {
    return null;
  }

  let data: any;
  try {
    data = await res.json();
  } catch (e) {
    // JSON Parse Failed -> Likely HTML Error Page
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

/**
 * Core request executor
 */
async function request<T, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(
  method: string,
  url: string,
  config: RestConfig<TParams, THeaders> = {},
): Promise<RestResponse<T>> {
  try {
    const { url: fullUrl, fetchConfig } = prepareFetchConfig(method, {
      ...config,
      baseURL: config.baseURL,
      params: config.params,
    });

    // Combine baseURL with url
    const finalUrl = config.baseURL
      ? buildUrl(url, config.baseURL, config.params as any)
      : buildUrl(url, undefined, config.params as any);

    const res = await fetch(finalUrl, fetchConfig);

    return await parseOrThrow(res);
  } catch (error) {
    // Catch Network Errors
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError({
      message: error instanceof Error ? error.message : "Network error",
      type: "NETWORK_ERROR",
      statusCode: 0,
      isOperational: true,
    });
  }
}

/**
 * REST API Client
 * Axios-like interface for making REST API calls
 */
export const restApi = {
  /**
   * GET request
   */
  get<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
    return request<T, TParams, THeaders>("GET", url, config);
  },

  /**
   * POST request
   */
  post<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
    return request<T, TParams, THeaders>("POST", url, config);
  },

  /**
   * PUT request
   */
  put<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
    return request<T, TParams, THeaders>("PUT", url, config);
  },

  /**
   * PATCH request
   */
  patch<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
    return request<T, TParams, THeaders>("PATCH", url, config);
  },

  /**
   * DELETE request
   */
  delete<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
    return request<T, TParams, THeaders>("DELETE", url, config);
  },

  /**
   * Create a pre-configured REST API instance
   * Similar to axios.create()
   */
  create(defaultConfig: RestConfig): RestApiInstance {
    return {
      get<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
        return request<T, TParams, THeaders>("GET", url, { ...defaultConfig, ...config } as RestConfig<TParams, THeaders>);
      },
      post<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
        return request<T, TParams, THeaders>("POST", url, { ...defaultConfig, ...config } as RestConfig<TParams, THeaders>);
      },
      put<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
        return request<T, TParams, THeaders>("PUT", url, { ...defaultConfig, ...config } as RestConfig<TParams, THeaders>);
      },
      patch<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
        return request<T, TParams, THeaders>("PATCH", url, { ...defaultConfig, ...config } as RestConfig<TParams, THeaders>);
      },
      delete<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>> {
        return request<T, TParams, THeaders>("DELETE", url, { ...defaultConfig, ...config } as RestConfig<TParams, THeaders>);
      },
    };
  },
};
