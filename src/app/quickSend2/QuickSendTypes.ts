import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export type CustomerState = {
  custId: number | null;
  customer: Customer | null;
  nameOverride: string;
  sizeOverride: string;
  /** Zip code selected as a tax rate override. `null` = use the customer's own taxRate. */
  taxRateZipOverride: string | null;
};

/** The set of flat @variable keys the editor can contain. */
export type VariableKey = "name" | "size" | "taxRate" | "season" | "sgBillpayInfo" | "aux" | "prepayPercent";

/**
 * Per-program configuration. Serializable — IDs only.
 *
 * `progCodeId` is the primary key. Unlike v1, there is no alias system —
 * each progCode can appear at most once in the program list.
 *
 * `priceOverride` — call-time per-visit price override. `null` = use chart price.
 * `prepayId` — per-program prepay code. `null` = fall back to global prepay.
 */
export type ProgramConfig = {
  progCodeId: string;
  includedServCodeIds: string[];
  priceOverride: number | null;
  prepayId: string | null;
};

/**
 * A single independently-editable section of a QuickSend template.
 * Program configs are shared globally across all sections.
 */
export type Section = {
  sectionId: string;
  name: string;
  templateHtml: string;
};

/**
 * Call-time overrides applied on top of the persisted program configs.
 * These are not saved back to the template unless the user explicitly saves.
 */
export type RuntimeOverrides = {
  /** Per-program call-time overrides. Key is progCodeId. */
  programConfigs: Partial<Record<string, Partial<ProgramConfig>>>;
  /**
   * Call-time global prepay override.
   * `undefined` = use the persisted default.
   * `null` = explicitly cleared (no prepay).
   */
  globalPrepayId: string | null | undefined;
};

export type QuickSendState = {
  sections: Section[];
  activeSectionId: string;
  /** Persisted default program selections (loaded from template). */
  programConfigs: ProgramConfig[];
  runtimeOverrides: RuntimeOverrides;
  /** Persisted global prepay default. */
  globalPrepayId: string | null;
  auxValues: Record<string, string>;
  customer: CustomerState;
  loadedTemplateId: string | null;
  loadedTemplateSaId: string | null;
  loadedTemplateName: string | null;
  loadedTemplateGroupId: string | null;
};

/**
 * Resolved variable values for a single program. These are the values
 * that mention nodes display in the preview.
 *
 * `progCodeId` is metadata — not exposed as a mention leaf prop.
 * `prepayPercent` is internal to pricing computation only — it is NOT exposed
 * as a per-program mention. The global prepay percentage is exposed as the
 * flat `@prepayPercent` mention instead.
 */
export type ProgramVariables = {
  progCodeId: string;
  description: string;
  servCount: number;
  prefPrice: number | null;
  econPrice: number | null;
  servPrice: number | null;
  subTotal: number | null;
  /** Internal only — used for pricing computation. Not exposed as a mention leaf. */
  prepayPercent: number | null;
  prepayDiscAmt: number | null;
  taxAmt: number | null;
  total: number | null;
  servTable: { description: string; price: number | null }[];
};

/**
 * The subset of `ProgramVariables` keys that are exposed as direct mention
 * leaf props (i.e. `{progCodeId}.{key}` and `loop.{key}`).
 *
 * `progCodeId` (metadata), `servTable` (only on direct program mentions),
 * and `prepayPercent` (exposed as flat `@prepayPercent` instead) are excluded.
 */
export type ProgLeafKey = Exclude<keyof ProgramVariables, "progCodeId" | "servTable" | "prepayPercent">;

/** Aggregate totals across all selected programs. */
export type ProgramAggregates = {
  subTotal: number | null;
  prepayDiscAmt: number | null;
  taxAmt: number | null;
  total: number | null;
};
