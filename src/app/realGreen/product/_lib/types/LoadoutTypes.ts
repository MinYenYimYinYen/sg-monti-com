import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  ProductMaster,
  SubProductConfig,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";

type AmountDetail = {
  plannedAmount: number;
  startAmount: number | null;
  finishAmount: number | null;
  unit: UnitCRM;
};

export type LoadoutMixedProduct = AmountDetail & {
  product: ProductSub;
};

export type LoadoutSubProduct = AmountDetail & {
  config: SubProductConfig;
  product: ProductSub;
  mixedProducts: LoadoutMixedProduct[];
};

export type LoadoutMaster = AmountDetail & {
  product: ProductMaster;
  subProducts: LoadoutSubProduct[];
};

export type Loadout = {
  masters: LoadoutMaster[];
};

export type LoadoutStored = Loadout & {
  schedDate: string;
  employeeId: string;
  serviceIds: number[];
};

export const baseLoadout: Loadout = { masters: [] };

export type LoadoutInventory = {
  masters: {
    product: ProductMaster;
    plannedAmount: number;
    startAmount: number | null;
    finishAmount: number | null;
    unit: UnitCRM;
    appMethods: {
      appMethod: AppMethod;
      subProducts: {
        product: ProductSub;
        plannedAmount: number;
        startAmount: number | null;
        finishAmount: number | null;
        unit: UnitCRM;
      }[];
    }[];
    subProducts: {
      product: ProductSub;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
      unit: UnitCRM;
    }[];
    singles: {
      product: ProductSub;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
      unit: UnitCRM;
    }[];
  }[];
};

export const baseLoadoutInventory: LoadoutInventory = { masters: [] };
