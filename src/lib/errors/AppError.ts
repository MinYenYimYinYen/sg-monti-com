// src/lib/AppError.ts
export type ErrorType =
  | "API_ERROR"      // Your Next.js API routes
  | "EXTERNAL_ERROR" // RealGreen or other 3rd parties
  | "AUTH_ERROR"     // 401/403
  | "VALIDATION_ERROR"     // 400 Bad Request
  | "SERVER_ERROR"   // 500+
  | "NETWORK_ERROR"  // fetch failed completely
  | "UNKNOWN_ERROR";

interface AppErrorParams {
  message: string;
  type?: ErrorType;
  statusCode?: number;
  isOperational?: boolean;
  data?: unknown;
  silent?: boolean;
}

export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly data?: unknown;
  public readonly silent?: boolean; // Matches your ErrorResponse

  constructor({
    message,
    type = "SERVER_ERROR",
    statusCode = 500,
    isOperational = true,
    data,
    silent,
  }: AppErrorParams) {
    super(message);
    this.name = "AppError";
    this.type = type;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.data = data;
    this.silent = silent;

    Object.setPrototypeOf(this, AppError.prototype);
    // Only capture stack if V8 (Chrome/Node)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
