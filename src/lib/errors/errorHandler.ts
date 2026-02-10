import { toast } from "react-toastify";
import { AppError } from "./AppError";

export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    const appError = new AppError({
      message: error.message,
      type: "UNKNOWN_ERROR",
      statusCode: 500,
      isOperational: false,
    });
    // Preserve the original stack trace
    appError.stack = error.stack;
    return appError;
  }
  return new AppError({
    message: "An unknown error occurred",
    type: "UNKNOWN_ERROR",
    statusCode: 500,
    isOperational: false,
  });
}

type HandleErrorOptions = {
  silent?: boolean;
};

export function handleError(error: unknown, options?: HandleErrorOptions) {
  const appError = normalizeError(error);

  // Apply overrides
  if (options?.silent !== undefined) {
    appError.silent = options.silent;
  }

  const isServer = typeof window === "undefined";

  // LOGGING
  if (isServer) {
    console.error(`[${appError.type}] ${appError.message}`, {
      data: appError.data,
      stack: appError.stack,
    });
  } else {
    if (!appError.silent) {
      console.error(`[${appError.type}]`, appError.message);
    }
  }

  // TOASTING (Client Only)
  if (!isServer && !appError.silent) {
    // Don't toast 404s usually
    if (appError.statusCode !== 404) {
      const userMessage = appError.isOperational
        ? appError.message
        : "An unexpected error occurred. Please run this up the chain of " +
          "command so it can be fixed.";
      toast.error(userMessage);
    }
  }

  return appError;
}
