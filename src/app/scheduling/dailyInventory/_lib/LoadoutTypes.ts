import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/appMethod/AppMethodTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { DeepNonNullable } from "@/lib/primatives/typeUtils/DeepNonNullable";
import { LoadoutConstituent } from "@/app/scheduling/dailyInventory/_lib/Mixture";

/**
 * LoadoutBase — the runtime loadout tree.
 *
 * Hierarchy:
 *   masters[]
 *     equipments[]   ← one per piece of equipment in the selected scenario
 *       constituents[]  ← all mixture components for this equipment:
 *                          [0] = water carrier (WATER_PRODUCT_ID, ratePerKsf = 0)
 *                               plannedAmount = total mixed solution volume
 *                          [1..n] = solutes (chemical products)
 *                               ratePerKsf = label rate (single-pass, no overlap)
 *     subProducts[]        ← non-equipment sub-products (manual rates)
 *   singles[]
 *   subProducts[]          ← custom/additional sub-products
 */
export type LoadoutBase = {
  masters: {
    productId: number;
    product: ProductMaster;
    plannedAmount: number;
    startAmount: number | null;
    finishAmount: number | null;
    unitId: number;
    unit: UnitCRM;
    /** Equipment entries from the selected scenario. Empty until a scenario is selected. */
    equipments: {
      /** Bucket key — matches Equipment.equipmentId */
      equipmentId: string;
      appMethod: AppMethod;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
      /**
       * All mixture constituents for this equipment.
       * constituents[0] is always the water carrier (productId === WATER_PRODUCT_ID, ratePerKsf = 0).
       * constituents[1..n] are solutes (chemical products mixed into the carrier).
       */
      constituents: LoadoutConstituent[];
    }[];
    subProducts: {
      productId: number;
      product: ProductSub;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
      unitId: number;
      unit: UnitCRM;
    }[];
  }[];
  singles: {
    productId: number;
    product: ProductSingle;
    unitId: number;
    unit: UnitCRM;
    startAmount: number | null;
    finishAmount: number | null;
  }[];
  subProducts: {
    productId: number;
    product: ProductSub;
    unitId: number;
    unit: UnitCRM;
    startAmount: number | null;
    finishAmount: number | null;
  }[];
};

export const baseLoadout: LoadoutBase = {
  masters: [],
  singles: [],
  subProducts: [],
};

/**
 * LoadoutDoc — the persisted MongoDB shape.
 *
 * Mirrors LoadoutBase but without hydrated objects (IDs only).
 */
export type LoadoutDoc = {
  employeeId: string;
  routeDate: string;
  truckId: string;
  rideOnId: string;
  isStored: boolean;
  masters: {
    productId: number;
    plannedAmount: number;
    startAmount: number | null;
    finishAmount: number | null;
    unitId: number;
    equipments: {
      equipmentId: string;
      /** The AppMethod actually used for this loadout (may differ from equipment default). */
      appMethodId: string;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
      /**
       * All mixture constituents for this equipment (IDs only).
       * constituents[0] is always the water carrier (productId === WATER_PRODUCT_ID).
       * constituents[1..n] are solutes.
       */
      constituents: {
        productId: number;
        plannedAmount: number;
        startAmount: number | null;
        finishAmount: number | null;
        unitId: number;
      }[];
    }[];
    subProducts: {
      productId: number;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
      unitId: number;
    }[];
  }[];
  /** Singles are "unplannable" products added ad-hoc by the tech — not children of any master. */
  singles: {
    productId: number;
    startAmount: number | null;
    finishAmount: number | null;
    unitId: number;
  }[];
  subProducts: {
    productId: number;
    startAmount: number | null;
    finishAmount: number | null;
    unitId: number;
  }[];
};

//todo: this can be used to sort finished loadouts from unfinished when we get to reporting
export type LoadoutFinal = DeepNonNullable<LoadoutDoc>
