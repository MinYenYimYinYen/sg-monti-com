import { AppError } from "@/lib/errors/AppError";

// Configuration Base Values
const ACCESS_TOKEN_MINUTES = 15;
const REFRESH_TOKEN_DAYS = 7;

export const AUTH_CONST = {
  COOKIE: {
    ACCESS_TOKEN: "sg_access_token",
    REFRESH_TOKEN: "sg_refresh_token",
  },
  EXPIRATION: {
    // JWT expects strings like "15m", "7d"
    JWT: {
      ACCESS: `${ACCESS_TOKEN_MINUTES}m`,
      REFRESH: `${REFRESH_TOKEN_DAYS}d`,
    },
    // Cookies expect Max-Age in Seconds
    COOKIE: {
      ACCESS: ACCESS_TOKEN_MINUTES * 60,
      REFRESH: REFRESH_TOKEN_DAYS * 24 * 60 * 60,
    },
  },
  SECRET: {
    get ACCESS() {
      const secret = process.env.ACCESS_SECRET;
      if (!secret) {
        throw new AppError({
          message: "Missing Environment Variable: ACCESS_SECRET",
          type: "SERVER_ERROR",
          isOperational: false,
        });
      }
      return secret;
    },
    get REFRESH() {
      const secret = process.env.REFRESH_SECRET;
      if (!secret) {
        throw new AppError({
          message: "Missing Environment Variable: REFRESH_SECRET",
          type: "SERVER_ERROR",
          isOperational: false,
        });
      }
      return secret;
    },
  },
  // All routes starting with these paths are public
  PUBLIC_PATHS: ["/auth"],
} as const;
