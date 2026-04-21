import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import type { GlobalSettings } from "@/app/globalSettings/_lib/GlobalSettingsTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import type { ServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

// ─── Customer variables ───────────────────────────────────────────────────────

/**
 * Allowlist of Customer properties that can be referenced in template bodies.
 * TypeScript enforces that every key here exists on Customer — if Customer
 * renames a property, this file will produce a compile error immediately.
 *
 * Variables are inserted as {{customer.<key>}} placeholders and resolved at
 * send time via `String(customer[key])`.
 */
export type CustomerVariableKey = keyof Pick<
  Customer,
  "displayName" | "email" | "size"
>;

/** Human-readable labels shown in the @ mention suggestion menu. */
export const CUSTOMER_VARIABLES: Record<CustomerVariableKey, string> = {
  displayName: "Customer Name",
  email: "Email",
  size: "Size",
};

// ─── Global settings variables ────────────────────────────────────────────────

export type GlobalSettingsVariableKey = keyof Pick<
  GlobalSettings,
  "season"
>;

export const GLOBAL_SETTINGS_VARIABLES: Record<GlobalSettingsVariableKey, string> = {
  season: "Season",
};

// ─── ProgCode scalar variables ────────────────────────────────────────────────

/**
 * Flat properties of ProgCode available as @mention variables in text/paragraph blocks.
 * Inserted as {{progCode.<key>}} and resolved at send time.
 */
export type ProgCodeVariableKey = keyof Pick<
  ProgCode,
  "description" | "programType"
>;

export const PROG_CODE_VARIABLES: Record<ProgCodeVariableKey, string> = {
  description: "Program Name",
  programType: "Program Type",
};

// ─── ServCode table columns ───────────────────────────────────────────────────

/**
 * Flat properties of ServCode that can be used as table columns.
 * TypeScript enforces these keys exist on ServCode.
 */
export type ServCodeColumnKey = keyof Pick<
  ServCode,
  "longName" | "invoiceMessage"
>;

export const SERV_CODE_COLUMNS: Record<ServCodeColumnKey, string> = {
  longName: "Service Name",
  invoiceMessage: "Invoice Message",
};

// ─── Table data source registry ───────────────────────────────────────────────

/**
 * Maps a `TableConfig.dataSource` key to the available row columns for that source.
 * `TableBlockEditor` uses this to populate its column field picker.
 * `resolveTemplate` uses the same key to know which array to iterate at send time.
 */
export const TABLE_DATA_SOURCES: Record<string, { rowColumns: Record<string, string> }> = {
  "progCode.servCodes": {
    rowColumns: SERV_CODE_COLUMNS,
  },
};
