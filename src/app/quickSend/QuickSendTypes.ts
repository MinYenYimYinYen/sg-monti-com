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
export type QSVariableKey = "name" | "size" | "taxRate" | "season" | "sgBillpayInfo";

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

/**
 * Resolved variable values for a single program alias. These are the values
 * that mention nodes display in the preview.
 *
 * `alias` and `progCodeId` are metadata — not exposed as mention leaf props.
 * `prepayPercent` is nested under the `prepay` namespace in mention IDs
 * (`program.{alias}.prepay.percent`) and is therefore also excluded from
 * `QSProgLeafKey`.
 */
export type QSProgramVariables = {
  alias: string;
  progCodeId: string;
  description: string;
  servCount: number;
  prefPrice: number | null;
  econPrice: number | null;
  servPrice: number | null;
  subTotal: number | null;
  prepayPercent: number | null;
  /** Dollar amount saved by prepaying (`subTotal × prepayPercent / 100`). Null if either input is null. */
  prepayDiscAmt: number | null;
  /** Tax on the post-prepay price. Null if tax rate is unavailable. */
  taxAmt: number | null;
  /** Final amount due: `(subTotal - prepayDiscAmt) + taxAmt`. Null if `subTotal` is null. */
  total: number | null;
  /** Per-service rows for the service breakdown table: description + individual price. */
  servTable: { description: string; price: number | null }[];
};

/**
 * The subset of `QSProgramVariables` keys that are exposed as direct mention
 * leaf props (i.e. `program.{alias}.{key}`).
 *
 * Metadata keys (`alias`, `progCodeId`) and the nested-namespace key
 * (`prepayPercent`, accessed via `program.{alias}.prepay.percent`) are excluded.
 *
 * `PROG_LEAF_PROPS` in `mentionSuggestion.ts` is exhaustiveness-checked against
 * this type so that renaming a key here causes a compile error there too.
 */
export type QSProgLeafKey = Exclude<keyof QSProgramVariables, "alias" | "progCodeId" | "prepayPercent" | "servTable">;
