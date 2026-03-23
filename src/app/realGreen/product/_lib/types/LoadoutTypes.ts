import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";

export type LoadoutMixedProduct = {
  product: ProductCommon;
  amount: number;
  unit: UnitCRM;
};

export type LoadoutSubProduct = {
  product: ProductCommon;
  amount: number;
  unit: UnitCRM;
  mixedProducts: LoadoutMixedProduct[];
};

export type LoadoutMaster = {
  product: ProductCommon;
  amount: number;
  unit: UnitCRM;
  subProducts: LoadoutSubProduct[];
};

export type Loadout = {
  masters: LoadoutMaster[];
};

export const baseLoadout: Loadout = { masters: [] };
