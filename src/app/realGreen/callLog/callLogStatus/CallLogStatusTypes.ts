import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

/**
 * Represents a call log status configuration entry.
 * The `code` field is the single-character code used by RealGreen (e.g. "X", "Z").
 * The `resolved` flag determines whether a call log with this status is considered resolved.
 *
 * This is a native data module — there is no RealGreen API endpoint for status data.
 * Statuses must be configured manually via the admin UI and are stored in MongoDB.
 * See callLogPlan.md Section 15 for limitations and future path.
 */
export type CallLogStatus = CreatedUpdated & {
  code: string;          // natural key — single-char RealGreen status code (e.g. "X", "Z")
  description: string;   // human-readable label (e.g. "Resolved", "In Process")
  resolved: boolean;     // whether this status counts as resolved
  isDefault: boolean;    // the CRM default status for new call logs
};
