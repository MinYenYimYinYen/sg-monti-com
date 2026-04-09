import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { LoadoutFinal } from "@/app/scheduling/dailyInventory/_lib/LoadoutTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
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

/**
 * One row per product in the merged feedback table.
 *
 * Three amounts are tracked per product:
 *   - actualUsed:  what the tech physically measured (loadout start − finish,
 *                  back-calculated per-chemical via the equipment mix ratio)
 *   - crmUsed:     what RealGreen recorded in production.usedAppProducts
 *                  (derived from service size, not a physical measurement)
 *   - plannedUsed: what should have been used based on configured rates
 *                  (storedRate × service.size, summed across completed services)
 */
export type ProductFeedbackEntry = {
  productId: number;
  description: string;
  unit: UnitCRM;
  actualUsed: number;
  crmUsed: number;
  plannedUsed: number;
  /** Positive = tech used more than CRM recorded. */
  actualVsCrm: number;
  /** Positive = tech used more than planned. */
  actualVsPlanned: number;
};

/**
 * One row per equipment entry in the loadout.
 * Represents the total mixture consumed (water + chemicals combined),
 * as measured by the tech at the tank level.
 */
export type EquipmentMixFeedback = {
  equipmentId: string;
  /** startAmount − finishAmount in gallons. */
  totalMixUsed: number;
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
  public get productFeedback(): ProductFeedbackEntry[] {
    return buildProductFeedback(
      this.actualUsedByProduct,
      this.crmUsedByProduct,
      this.plannedUsedByProduct,
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
