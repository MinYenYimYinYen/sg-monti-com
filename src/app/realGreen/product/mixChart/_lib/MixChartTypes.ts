import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";
import { AppMethod } from "@/app/appMethod/AppMethodTypes";

/**
 * A single product row in the mix chart.
 *
 * The chart is built from an arbitrary list of these rows, independent of how products are
 * grouped in the database.
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
  /** The picked saved app method. Null until one is picked; the water column needs it. */
  appMethod: AppMethod | null;
  /** True shows the water column in fl oz, false in gallons. */
  showFlOz: boolean;
  /** Chart title shown on the PDF. */
  title: string;
  /** Whether to include a water column in the chart. */
  includeWater: boolean;
  /** The product rows to chart. */
  products: MixChartProductRow[];
};
