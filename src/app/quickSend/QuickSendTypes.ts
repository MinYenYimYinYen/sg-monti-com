import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export type QSCustomerState = {
  custId: number | null;
  customer: Customer | null;
  nameOverride: string;
  sizeOverride: string;
  /** Zip code selected as a tax rate override. `null` = use the customer's own taxRate. */
  taxRateZipOverride: string | null;
};

/** The set of flat @variable keys the editor can contain. */
export type QSVariableKey = "name" | "size" | "taxRate";

/**
 * Per-program configuration stored in QuickSend state. Serializable — IDs only.
 *
 * `alias` is the mention ID segment (e.g. "MLC", "MLC_2"). It is the key used
 * in template mention IDs (`program.{alias}.{prop}`) and in control IDs
 * (`programConfig:{alias}`). Multiple configs can share the same `progCodeId`
 * (same RealGreen program) but have different aliases and independent servCode
 * selections.
 *
 * Program configs are global (not per-section) — the same alias and its servCode
 * selection applies across all sections of the template.
 *
 * `prepayId` — the prepay code applied to this program for discount display.
 * `null` means no prepay is selected.
 */
export type QSProgramConfig = {
  alias: string;
  progCodeId: string;
  includedServCodeIds: string[];
  prepayId: string | null;
};

/**
 * A single independently-editable section of a QuickSend template.
 * Each section has its own Tiptap HTML. Program configs are shared globally
 * across all sections (see `QuickSendState.programConfigs`).
 */
export type QSSection = {
  sectionId: string;
  templateHtml: string;
};

/**
 * IDs for left-panel controls. Each mention type declares which controls it requires.
 * `QuickSend.tsx` maps these IDs to the actual components to render.
 *
 * Dependencies:
 * - @name          → customerLookup, nameOverride
 * - @size          → customerLookup, sizeOverride
 * - @program.X.*  → customerLookup, sizeOverride, programConfig:X
 */
export type TemplateControlId =
  | "customerLookup"
  | "nameOverride"
  | "sizeOverride"
  | "taxRateOverride"
  | `programConfig:${string}`;
