import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { Equipment } from "@/app/equipment/EquipmentTypes";
import { AppMethodResult } from "@/app/appMethod/appMethodSolver/AppMethodSolverTypes";

/**
 * A single product row in the mix chart.
 *
 * The chart is built from an arbitrary list of these rows — independent of
 * how products are tagged to equipment in the database (mixedByEquipmentIds is ignored).
 *
 * rate is in the product's app unit per ksf.
 */
export type MixChartProductRow = {
  /** Stable local key (used as React key and for removal). */
  id: string;
  /** Display label shown in the column header. */
  label: string;
  /** Application rate in the product's app unit per ksf. */
  rate: number;
  /** Used to format amounts in the chart cells. */
  unitConfigDisplay: UnitConfigDisplay;
  /** Where this row came from — for display metadata only, not used in chart math. */
  source:
    | { type: "master-sub"; masterProductId: number; subId: number }
    | { type: "sub"; productId: number }
    | { type: "single"; productId: number }
    | { type: "manual" };
};

/**
 * The full configuration for the mix chart.
 * Held in local React state in page.tsx.
 */
export type MixChartConfig = {
  /** The selected piece of equipment (determines water rate and showFlOz). */
  equipment: Equipment | null;
  /**
   * Local override of the equipment's AppMethod parameters.
   * When non-null, this is used instead of equipment.appMethod to derive the water rate.
   * Populated from the createAppMethod Redux slice's solver solution.
   */
  appMethodOverride: AppMethodResult | null;
  /** Whether to include a water column in the chart. */
  includeWater: boolean;
  /** The product rows to chart. */
  products: MixChartProductRow[];
};
