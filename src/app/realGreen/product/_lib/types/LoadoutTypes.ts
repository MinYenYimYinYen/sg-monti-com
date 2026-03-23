import { ProductCommon } from "@/app/realGreen/product/_lib/types/ProductTypes";
import { Unit } from "@/app/realGreen/product/unitConfig/UnitTypes";

type LoadoutMixedProduct = {
  product: ProductCommon;
  amount: number;
  unit: Unit;
};

type LoadoutSubProduct = {
  product: ProductCommon;
  amount: number;
  unit: Unit;
  mixedProducts: LoadoutMixedProduct[];
};

type LoadoutMaster = {
  product: ProductCommon;
  amount: number;
  unit: Unit;
  subProducts: LoadoutSubProduct[];
};

export type Loadout = {
  masters: LoadoutMaster[];
};

export const baseLoadout: Loadout = { masters: [] };
