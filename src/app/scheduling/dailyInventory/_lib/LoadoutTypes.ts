import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/appMethod/AppMethodTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { DeepNonNullable } from "@/lib/primatives/typeUtils/DeepNonNullable";

/**
 * LoadoutBase — the runtime loadout tree.
 *
 * Hierarchy:
 *   masters[]
 *     equipments[]   ← one per piece of equipment in the selected scenario
 *       mixProduct         ← water carrier (auto-generated from waterProduct constant)
 *       subProducts[]      ← mixed products for this equipment
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
      mixProductId: number;
      mixProduct: ProductSub;
      mixProductUnitId: number;
      mixProductUnit: UnitCRM;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
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
  masters: {
    productId: number;
    plannedAmount: number;
    startAmount: number | null;
    finishAmount: number | null;
    unitId: number;
    equipmentEntries: {
      equipmentId: string;
      mixProductId: number;
      mixProductUnitId: number;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
      subProducts: {
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

export type LoadoutFinal = DeepNonNullable<LoadoutDoc>

