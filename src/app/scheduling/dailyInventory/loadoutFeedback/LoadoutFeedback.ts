import { LoadoutActuals } from "@/app/loadout/LoadoutTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import type { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  buildEquipmentChemicalFeedback,
  buildEquipmentMixFeedback,
  buildOtherFeedback,
  buildServiceWarnings,
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
  /** Σ (service.size × subProductConfig.rate) — the amount the CRM would post based on label rate × treated area. Contrasted with actualUsed (physical measurement) to surface CRM entry discrepancies. */
  postedAmount: number;
  /** actualUsed − postedAmount. Positive = tech physically used more than the posted rate implies. */
  actualVsPosted: number;
  /** Positive = tech used more than planned. */
  actualVsPlanned: number;
  /** servIds where ap.treated !== service.size — tablet recorded stale treated area. */
  discrepantServiceIds: Set<number>;
};

// ---------------------------------------------------------------------------
// ServiceWarnings
// ---------------------------------------------------------------------------

/**
 * Per-service warnings derived from CRM production data.
 * Only services with at least one warning are included in serviceWarnings.
 */
export type ServiceWarnings = {
  service: Service;
  warnings: string[];
};

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class LoadoutFeedback {
  constructor(
    private readonly _actuals: LoadoutActuals,
    private readonly _completedServices: Service[],
    private readonly _scheduledServices: Service[],
  ) {}

  public get actuals(): LoadoutActuals {
    return this._actuals;
  }

  public get scheduleCount() {
    return this._scheduledServices.length;
  }

  public get completedCount() {
    return this._completedServices.length;
  }

  public get completionRate() {
    return this._scheduledServices.length > 0
      ? this._completedServices.length / this._scheduledServices.length
      : 0;
  }

  public get completedSize() {
    return this._completedServices.reduce((sum, s) => sum + s.size, 0);
  }

  public get scheduledSize() {
    return this._scheduledServices.reduce((sum, s) => sum + s.size, 0);
  }

  public get sizeCompletionRate() {
    const scheduled = this.scheduledSize;
    return scheduled > 0 ? this.completedSize / scheduled : 0;
  }

  public get serviceWarnings(): ServiceWarnings[] {
    return buildServiceWarnings(this._completedServices);
  }

  /** O(1) lookup map from servId → warning strings. */
  public get serviceWarningMap(): Map<number, string[]> {
    return new Map(
      this.serviceWarnings.map(({ service, warnings }) => [
        service.servId,
        warnings,
      ]),
    );
  }

  /** Tank-level start/finish/used per equipment entry. */
  public get equipmentMixFeedback(): EquipmentMixFeedback[] {
    return buildEquipmentMixFeedback(this._actuals);
  }

  /** Per-chemical back-calculated amounts for tank-mixed equipment entries.
   * This is unused by the LoadoutFeedback UI. But we'll keep it because it
   * will be useful for analyzing the value of deviation from the planned mix.
   * */
  public get equipmentChemicalFeedback(): EquipmentChemicalFeedback[] {
    return buildEquipmentChemicalFeedback(this._actuals);
  }

  /** Flat per-sub-product rows for other (non-equipment) masters. */
  public get otherFeedback(): OtherSubProductFeedback[] {
    return buildOtherFeedback(this._actuals);
  }
}
