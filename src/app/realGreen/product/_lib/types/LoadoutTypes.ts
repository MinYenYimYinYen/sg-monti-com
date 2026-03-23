import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  ProductMaster,
  SubProductConfig,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";

export type LoadoutMixedProduct = {
  product: ProductSub;
  amount: number;
  unit: UnitCRM;
};

export type LoadoutSubProduct = {
  config: SubProductConfig;
  product: ProductSub;
  amount: number;
  unit: UnitCRM;
  mixedProducts: LoadoutMixedProduct[];
};

export type LoadoutMaster = {
  product: ProductMaster;
  amount: number;
  unit: UnitCRM;
  subProducts: LoadoutSubProduct[];
};

export type Loadout = {
  masters: LoadoutMaster[];
};

export const baseLoadout: Loadout = { masters: [] };
