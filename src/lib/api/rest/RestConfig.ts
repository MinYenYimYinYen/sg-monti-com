import { ErrorResponse } from "@/lib/api/types/responses";

/**
 * REST API Configuration
 * Extends standard RequestInit but unlocks body and adds REST-specific options
 *
 * @template TParams - Type for query parameters (default: any)
 * @template THeaders - Type for custom headers (default: Record<string, string>)
 */
export interface RestConfig<TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>> extends Omit<RequestInit, "body" | "method"> {
  /** Base URL to prepend to all requests (e.g., 'https://domain.api.engagement.dimelo.com') */
  baseURL?: string;
  /** Request body (will be auto-stringified if object) */
  body?: unknown;
  /** Query parameters to append to URL */
  params?: TParams;
  /** Custom headers */
  headers?: THeaders;
}

/**
 * Response type for REST API calls
 * Either returns the expected data type T, or an ErrorResponse
 */
export type RestResponse<T> = T | ErrorResponse;

/**
 * REST API Instance
 * Created via restApi.create() with pre-configured defaults
 */
export interface RestApiInstance {
  get<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>>;
  post<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>>;
  put<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>>;
  patch<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>>;
  delete<T = any, TParams = any, THeaders extends HeadersInit | undefined = Record<string, string>>(url: string, config?: RestConfig<TParams, THeaders>): Promise<RestResponse<T>>;
}
