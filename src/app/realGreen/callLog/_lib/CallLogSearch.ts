import { TRange } from "@/lib/primatives/tRange/TRange";
import { RGStringRange } from "@/app/realGreen/_lib/subTypes/RGSearchRanges";

// --- CallLogSearchRaw ---
// Mirrors the RealGreen /CallLog/CallLogSearch POST body exactly.
// Use CallLogSearchCriteria in application code; remap to this before calling rgApi.

export type CallLogSearchRaw = {
  customerID?: number[];
  enterDate?: RGStringRange;
  dueDate?: RGStringRange;
  phone?: string;
  status?: string[];
  enteredBy?: string[];
  assignedTo?: string[];
  created?: RGStringRange;
  updated?: RGStringRange;
  /** Max 500 records per page. */
  records?: number;
  offset?: number;
};

// --- CallLogSearchCriteria ---
// Our preferred naming and types for building call log queries.
// Remap to CallLogSearchRaw via remapCallLogSearch before sending to the API.

export type CallLogSearchCriteria = {
  custIds?: number[];
  enterDate?: TRange<string>;
  dueDate?: TRange<string>;
  phone?: string;
  statuses?: string[];
  enteredBy?: string[];
  assignedTo?: string[];
  /** ISO 8601 date range for when the record was created in RealGreen. */
  created?: TRange<string>;
  /** ISO 8601 date range for when the record was last updated in RealGreen.
   *  This is the delta-sync key — use updated.min = lastSyncedAt for incremental fetches. */
  updated?: TRange<string>;
  /** Max 500. Defaults to 500 if omitted. */
  records?: number;
  offset?: number;
};
