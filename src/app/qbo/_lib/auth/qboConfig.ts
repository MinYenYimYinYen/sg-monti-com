import { Buffer } from "buffer";
import { AppError } from "@/lib/errors/AppError";
import { QboConfig } from "@/app/qbo/_lib/auth/qboOAuthTypes";
import { parseEncryptionKey } from "@/app/qbo/_lib/auth/qboCrypto";
import { parseQboEnvironment, validateRedirectUri } from "@/app/qbo/_lib/auth/qboOAuthUtils";

// Server only. These are read lazily (not at import time) so a missing variable becomes a
// clear error on the connection page instead of crashing unrelated routes at build time.
// None of them may ever carry a NEXT_PUBLIC_ prefix.
const REQUIRED_VARIABLES = [
  "QBO_CLIENT_ID",
  "QBO_CLIENT_SECRET",
  "QBO_REDIRECT_URI",
  "QBO_ENVIRONMENT",
] as const;

function configError(message: string): AppError {
  return new AppError({ message, type: "SERVER_ERROR", statusCode: 500, isOperational: true });
}

export function getQboConfig(): QboConfig {
  const missing = REQUIRED_VARIABLES.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    throw configError(`QuickBooks is not configured on this server. Missing: ${missing.join(", ")}.`);
  }

  const environment = parseQboEnvironment(process.env.QBO_ENVIRONMENT);
  if (!environment) {
    throw configError('QBO_ENVIRONMENT must be "sandbox" or "production".');
  }

  const redirectUri = process.env.QBO_REDIRECT_URI!.trim();
  const redirectProblem = validateRedirectUri({ redirectUri, environment });
  if (redirectProblem) throw configError(redirectProblem);

  return {
    clientId: process.env.QBO_CLIENT_ID!.trim(),
    clientSecret: process.env.QBO_CLIENT_SECRET!.trim(),
    redirectUri,
    environment,
  };
}

export function getEncryptionKey(): Buffer {
  try {
    return parseEncryptionKey(process.env.QBO_TOKEN_ENCRYPTION_KEY);
  } catch (e) {
    // The message names the variable and the expected size only, never the key itself.
    throw configError(e instanceof Error ? e.message : "QBO_TOKEN_ENCRYPTION_KEY is invalid.");
  }
}
