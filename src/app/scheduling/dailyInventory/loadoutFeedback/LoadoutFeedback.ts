import { LoadoutActuals } from "@/app/loadout/LoadoutTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import type { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import {
  buildEquipmentChemicalFeedback,
  buildEquipmentMixFeedback,
  buildOtherFeedback,
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
  /** Actual treated ksf for this master, derived from matched services' CRM data. */
  completedKsf: number;
  plannedAmount: number;
  startAmount: number;
  finishAmount: number;
  /** startAmount − finishAmount */
  totalMixUsed: number;
  /**
   * Expected mix volume for completedKsf based on appMethod coverage rate.
   * Null when completedKsf = 0 (no matched services logged this equipment's products).
   */
  expectedMixUsed: number | null;
  /**
   * totalMixUsed − expectedMixUsed. Positive = tech used more than expected.
   * Null when expectedMixUsed is null.
   */
  mixVsExpected: number | null;
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
 * One row per sub-product in an other (non-equipment) master.
 * Planned is scaled to completed services using per-product size from CRM data.
 */
export type OtherSubProductFeedback = {
  productId: number;
  description: string;
  unit: UnitCRM;
  unitConfigDisplay: UnitConfigDisplay;
  /** Planned rate in sub-product units per ksf (derived from loadout). */
  plannedRate: number;
  /** plannedRate × completedKsf. */
  plannedUsed: number;
  /** Raw start amount from the loadout. */
  startAmount: number;
  /** Raw finish amount from the loadout. */
  finishAmount: number;
  /** startAmount − finishAmount from the loadout. */
  actualUsed: number;
  /** Actual treated ksf from matched services' CRM data. */
  completedKsf: number;
  /** Σ appProduct.amount for this productId across matched services. */
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
    private readonly _actuals: LoadoutActuals,
    private readonly _completedCount: number,
    private readonly _scheduledCount: number,
    private readonly _completedSize: number,
    private readonly _scheduledSize: number,
  ) {}

  public get actuals(): LoadoutActuals {
    return this._actuals;
  }

  public get scheduleCount() {
    return this._scheduledCount;
  }

  public get completedCount() {
    return this._completedCount;
  }

  public get completionRate() {
    return this._scheduledCount > 0 ? this._completedCount / this._scheduledCount : 0;
  }

  public get completedSize() {
    return this._completedSize;
  }

  public get scheduledSize() {
    return this._scheduledSize;
  }

  public get sizeCompletionRate() {
    return this._scheduledSize > 0 ? this._completedSize / this._scheduledSize : 0;
  }

  /** Tank-level start/finish/used per equipment entry. */
  public get equipmentMixFeedback(): EquipmentMixFeedback[] {
    return buildEquipmentMixFeedback(this._actuals);
  }

  /** Per-chemical back-calculated amounts for tank-mixed equipment entries. */
  public get equipmentChemicalFeedback(): EquipmentChemicalFeedback[] {
    return buildEquipmentChemicalFeedback(this._actuals);
  }

  /** Flat per-sub-product rows for other (non-equipment) masters. */
  public get otherFeedback(): OtherSubProductFeedback[] {
    return buildOtherFeedback(this._actuals);
  }
}
