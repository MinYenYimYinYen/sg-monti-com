import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";

export type QSCustomerState = {
  custId: number | null;
  customer: Customer | null;
  nameOverride: string;
  sizeOverride: string;
};

/** The set of flat @variable keys the editor can contain. */
export type QSVariableKey = "name" | "size";

/**
 * Per-program configuration stored in QuickSend state. Serializable — IDs only.
 *
 * `alias` is the mention ID segment (e.g. "MLC", "MLC_2"). It is the key used
 * in template mention IDs (`program.{alias}.{prop}`) and in control IDs
 * (`programConfig:{alias}`). Multiple configs can share the same `progCodeId`
 * (same RealGreen program) but have different aliases and independent servCode
 * selections.
 */
export type QSProgramConfig = {
  alias: string;
  progCodeId: string;
  includedServCodeIds: string[];
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
  | `programConfig:${string}`;
