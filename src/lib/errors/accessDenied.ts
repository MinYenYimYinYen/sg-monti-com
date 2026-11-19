import type { ErrorResponse } from "@/lib/api/types/responses";
import { AppError } from "@/lib/errors/AppError";

// Pure helpers for the 403 "missing capability" path. No store, no toast, no React, so the
// message and the detection can be tested on their own.

/** The capability a 403 says was missing, read from untyped error data. Null when absent. */
export function requiredFromData(data: unknown): string | null {
  if (typeof data !== "object" || data === null || !("required" in data)) return null;
  const { required } = data as { required: unknown };
  return typeof required === "string" && required.length > 0 ? required : null;
}

/** The missing capability of a structured API failure, or null unless it is a 403 that names one. */
export function deniedCapabilityOfResponse(res: ErrorResponse): string | null {
  if (res.code !== 403) return null;
  return typeof res.required === "string" && res.required.length > 0 ? res.required : null;
}

/** The missing capability of a thrown error, or null unless it is a 403 AppError that names one. */
export function deniedCapabilityOfError(error: unknown): string | null {
  if (!(error instanceof AppError) || error.statusCode !== 403) return null;
  return requiredFromData(error.data);
}

/**
 * One sentence listing what was missing. Capabilities are de-duplicated, then sorted by the
 * text shown, so the same set always reads the same.
 */
export function formatAccessDeniedMessage({
  capabilities,
  labelOf,
}: {
  capabilities: readonly string[];
  labelOf: (capability: string) => string;
}): string {
  const labels = [...new Set(capabilities)].map(labelOf).sort((first, second) => first.localeCompare(second));
  return `Some data or actions are not available to your account. Missing permissions: ${labels.join(", ")}.`;
}
