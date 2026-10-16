import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// ---------------------------------------------------------------------------
// RouteNote — a manager-authored note attached to a specific employee+date
// or to a date alone (crew lead summary note).
// ---------------------------------------------------------------------------

export type RouteNote = CreatedUpdated & {
  routeNoteId: string;
  schedDate: string;
  /**
   * The employee this note is for.
   * null = day-level note (no specific employee — crew lead summary only).
   */
  employeeId: string | null;
  /** Tiptap HTML with @mention nodes. Used by the editor to restore the editing experience. */
  noteHtml: string;
  /**
   * Resolved plain text — derived from noteHtml at save time.
   * Use this for display, printing, and clipboard copy. Never write independently of noteHtml.
   */
  note: string;
  /**
   * Print this note on the employee's individual cover sheet (before the service list).
   * Irrelevant when employeeId is null — day-level notes are never on individual sheets.
   */
  showOnCoverSheet: boolean;
  /**
   * Include this note in the crew lead clipboard summary for the day.
   * Always true for day-level notes (employeeId === null).
   */
  showInCrewLeadSummary: boolean;
};

// ---------------------------------------------------------------------------
// MentionEditor variable set for RouteNote notes.
// Empty for now — extend as needs arise (e.g., serviceCount, totalPrice).
// ---------------------------------------------------------------------------

export type RouteNoteVars = Record<string, never>;
