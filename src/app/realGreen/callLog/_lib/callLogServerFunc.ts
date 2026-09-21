import { remapCallLogs } from "@/app/realGreen/callLog/CallLogTypes";

// Re-export remapCallLogs for use in API route handlers.
// Upsert/persistence helpers (upsertCallLogs, getCallLogDocsByCustIds) are
// deferred to the sync layer — see callLogSyncPlan.md.
export { remapCallLogs };
