import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { LoadoutFinal } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import type { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import {
  buildEquipmentChemicalFeedback,
  buildEquipmentMixFeedback,
  buildGranularFeedback,
} from "./loadoutFeedbackHelpers";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * One row per equipment entry in the loadout.
 * Amounts are in the carrier's app unit (gallons).
 */
export type EquipmentMixFeedback = {
  equipmentId: string;
  plannedAmount: number;
  startAmount: number;
  finishAmount: number;
  /** startAmount − finishAmount */
  totalMixUsed: number;
  unitConfigDisplay: UnitConfigDisplay;
};

/**
 * One row per non-water constituent in a tank-mixed equipment entry.
 * Amounts are back-calculated from the tank usage ratio.
 */
export type EquipmentChemicalFeedback = {
  equipmentId: string;
  productId: number;
  description: string;
  unit: UnitCRM;
  unitConfigDisplay: UnitConfigDisplay;
  plannedAmount: number;
  actualAmount: number;
};

/**
 * One row per sub-product (chemical) in a granular master.
 * Planned is scaled to completed services using per-product size completion ratios.
 */
export type GranularSubProductFeedback = {
  productId: number;
  description: string;
  unit: UnitCRM;
  unitConfigDisplay: UnitConfigDisplay;
  /** Planned rate in sub-product units per ksf (derived from loadout). */
  plannedRate: number;
  /** plannedRate × completed ksf for this product. */
  plannedUsed: number;
  /** startAmount − finishAmount from the loadout. */
  actualUsed: number;
  /** From production.usedAppProducts[]. */
  crmUsed: number;
  /** Positive = tech used more than CRM recorded. */
  actualVsCrm: number;
  /** Positive = tech used more than planned. */
  actualVsPlanned: number;
};

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class LoadoutFeedback {
  constructor(
    private readonly completed: Service[],
    private readonly scheduled: Service[],
    private readonly loadout: LoadoutFinal,
  ) {}

  public get scheduleCount() {
    return this.scheduled.length;
  }

  public get completedCount() {
    return this.completed.length;
  }

  public get completionRate() {
    return this.scheduleCount > 0 ? this.completedCount / this.scheduleCount : 0;
  }

  public get completedSize() {
    return this.completed.reduce((sum, s) => sum + s.size, 0);
  }

  public get scheduledSize() {
    return this.scheduled.reduce((sum, s) => sum + s.size, 0);
  }

  public get sizeCompletionRate() {
    return this.scheduledSize > 0 ? this.completedSize / this.scheduledSize : 0;
  }

  /** Tank-level start/finish/used per equipment entry. */
  public get equipmentMixFeedback(): EquipmentMixFeedback[] {
    return buildEquipmentMixFeedback(this.loadout);
  }

  /** Per-chemical back-calculated amounts for tank-mixed equipment entries. */
  public get equipmentChemicalFeedback(): EquipmentChemicalFeedback[] {
    return buildEquipmentChemicalFeedback(this.loadout);
  }

  /** Flat per-sub-product rows for granular masters (no equipment). */
  public get granularFeedback(): GranularSubProductFeedback[] {
    return buildGranularFeedback(this.completed, this.scheduled, this.loadout);
  }
}
