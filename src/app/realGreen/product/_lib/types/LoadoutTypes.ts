import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

export type LoadoutBase = {
  masters: {
    product: ProductMaster;
    plannedAmount: number;
    startAmount: number | null;
    finishAmount: number | null;
    unit: UnitCRM;
    appMethods: {
      appMethod: AppMethod;
      mixProduct: ProductSub;
      mixProductUnit: UnitCRM;
      plannedAmount: number;
      startAmount: number | null;
      finishAmount: number | null;
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
  }[];
};


export type CustomProducts = {
  singles: {
    product: ProductSingle;
    unit: UnitCRM;
    startAmount: number;
    finishAmount: number;
  }[],
  subProducts: {
    product: ProductSub;
    unit: UnitCRM;
    startAmount: number;
    finishAmount: number;
  }[]
}

export type LoadoutInventory = LoadoutBase & CustomProducts
export const baseLoadoutInventory: LoadoutInventory = { masters: [], singles: [], subProducts: [] };
