import { AppMethod } from "@/app/appMethod/AppMethodTypes";

// ---------------------------------------------------------------------------
// Doc types (MongoDB storage)
// ---------------------------------------------------------------------------

/**
 * EquipmentEntryDoc - stored form of one piece of equipment within a scenario.
 *
 * References an AppMethod by ID. Hydrated into EquipmentEntry at runtime.
 */
export type EquipmentEntryDoc = {
  /** User-defined unique key within the master (e.g. "MAIN_TANK", "INJECTION_UNIT"). */
  equipmentId: string;
  /** Display label (e.g. "Main Tank"). */
  description: string;
  /** References AppMethod entity. */
  appMethodId: string;
  /** Sub-product IDs mixed into this equipment's water. */
  mixedProductIds: number[];
};

/**
 * EquipmentScenarioDoc - stored form of a complete truck configuration.
 *
 * Contains one or more EquipmentEntryDoc items.
 * Workers pick exactly one scenario per master product per day.
 */
export type EquipmentScenarioDoc = {
  /** User-defined unique key (e.g. "FULL_RIG", "MAIN_TANK_ONLY"). */
  scenarioId: string;
  /** Display label (e.g. "Full Rig"). */
  description: string;
  equipmentEntries: EquipmentEntryDoc[];
};

// ---------------------------------------------------------------------------
// Hydrated types (runtime / selector output)
// ---------------------------------------------------------------------------

/**
 * EquipmentEntry - hydrated form of one piece of equipment within a scenario.
 *
 * appMethodId is resolved to a full AppMethod object.
 * waterRate is pre-calculated from the AppMethod's coverage.
 */
export type EquipmentEntry = EquipmentEntryDoc & {
  appMethod: AppMethod;
  /** Application rate in volume/ksf (e.g. gal/1000 sf). */
  waterRate: number;
};

/**
 * EquipmentScenario - hydrated form of a complete truck configuration.
 *
 * All EquipmentEntryDoc items are resolved to EquipmentEntry.
 */
export type EquipmentScenario = EquipmentScenarioDoc & {
  equipmentEntries: EquipmentEntry[];
};
