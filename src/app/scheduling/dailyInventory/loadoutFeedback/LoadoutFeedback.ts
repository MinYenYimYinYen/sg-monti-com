import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { LoadoutFinal } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import type { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import {
  buildActualUsedByProduct,
  buildCrmUsedByProduct,
  buildEquipmentMixFeedback,
  buildPlannedUsedByProduct,
  buildProductFeedback,
} from "./loadoutFeedbackHelpers";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ProductFeedbackEntry = {
  productId: number;
  description: string;
  unit: UnitCRM;
  /** Display helper for formatting amounts in app or load units. */
  unitConfigDisplay: UnitConfigDisplay;
  actualUsed: number;
  crmUsed: number;
  plannedUsed: number;
  /** Positive = tech used more than CRM recorded. */
  actualVsCrm: number;
  /** Positive = tech used more than planned. */
  actualVsPlanned: number;
};

/**
 * A master product row with its sub-products (constituents + standalone sub-products)
 * nested beneath it. Sub-products are hidden by default and revealed on click.
 */
export type MasterProductFeedbackEntry = ProductFeedbackEntry & {
  subProducts: ProductFeedbackEntry[];
};

/**
 * One row per equipment entry in the loadout.
 * Amounts are in the carrier's app unit (gallons).
 * unitConfigDisplay is from the water carrier constituent and supports
 * formatting in app unit, load unit, or percentage views.
 */
export type EquipmentMixFeedback = {
  equipmentId: string;
  plannedAmount: number;
  startAmount: number;
  finishAmount: number;
  /** startAmount − finishAmount */
  totalMixUsed: number;
  /** Carrier's unit display helper for app/load unit formatting. */
  unitConfigDisplay: UnitConfigDisplay;
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
    return this.completedCount / this.scheduleCount;
  }

  /** Total mixture consumed per equipment entry (tank-level measurement). */
  public get equipmentMixFeedback(): EquipmentMixFeedback[] {
    return buildEquipmentMixFeedback(this.loadout);
  }

  /** Merged per-product summary across physical measurement, CRM records, and planned rates. */
  public get productFeedback(): MasterProductFeedbackEntry[] {
    return buildProductFeedback(
      this.actualUsedByProduct,
      this.crmUsedByProduct,
      this.plannedUsedByProduct,
      this.loadout,
    );
  }

  /** Physical measurement from the loadout (equipment ratio + direct sub/singles). */
  private get actualUsedByProduct() {
    return buildActualUsedByProduct(this.loadout);
  }

  /** RealGreen CRM records from production.usedAppProducts[]. */
  private get crmUsedByProduct() {
    return buildCrmUsedByProduct(this.completed);
  }

  /** Planned amounts from the loadout (masters, constituents, sub-products). */
  private get plannedUsedByProduct() {
    return buildPlannedUsedByProduct(this.loadout);
  }
}
