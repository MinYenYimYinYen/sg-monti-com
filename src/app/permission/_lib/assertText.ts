import { AppError } from "@/lib/errors/AppError";

/**
 * A request body is untrusted JSON, so a field typed `string` can arrive as an object such as
 * `{ "$ne": null }`, which Mongo would read as a query operator. Handlers check before querying.
 */
export function assertText({ value, label }: { value: unknown; label: string }): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError({ message: `${label} is required.`, type: "VALIDATION_ERROR", statusCode: 400 });
  }
  return value;
}
