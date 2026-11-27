import { UnitLabel } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";

export type ProductCount = {
  qty: number;
  unit: UnitLabel;
  unitQty?: number; // container size — e.g. 2.5 for "2.5 gal container"
  location?: string; // free text, optional
};

export type InventoryCheckEntry = {
  productId: number;
  totalCount: number; // sum of all ProductCounts converted to app units
  unit: UnitLabel; // the app unit for this product
  counts: ProductCount[];
};

export type InventoryCheckDoc = {
  checkDate: string; // ISO date — "as of" date (today at time of save)
  entries: InventoryCheckEntry[];
  createdBy: string; // user.userName
};

// Hydrated version — productId resolved to ProductCommon
export type InventoryCheckEntryHydrated = InventoryCheckEntry & {
  product: ProductCommon;
};

export type InventoryCheck = Omit<InventoryCheckDoc, "entries"> & {
  entries: InventoryCheckEntryHydrated[];
};

export type InventorySession = {
  activeProductIds: number[];
  counts: Record<number, ProductCount[]>; // retained even when product removed from activeProductIds
};

export type LastProductCount = {
  totalCount: number;
  unit: UnitLabel;
  date: string; // checkDate of the check it came from
};
