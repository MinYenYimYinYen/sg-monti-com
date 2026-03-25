import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";
import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";

export type LoadoutBase = {
  masters: {
    productId: number;
    product: ProductMaster;
    plannedAmount: number;
    startAmount: number | null;
    finishAmount: number | null;
    unitId: number;
    unit: UnitCRM;
    appMethods: {
      appMethodId: string;
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
};

export type CustomProducts = {
  singles: {
    productId: number;
    product: ProductSingle;
    unitId: number;
    unit: UnitCRM;
    startAmount: number;
    finishAmount: number;
  }[];
  subProducts: {
    productId: number;
    product: ProductSub;
    unitId: number;
    unit: UnitCRM;
    startAmount: number;
    finishAmount: number;
  }[];
};

export type LoadoutStart = LoadoutBase & CustomProducts;
export const baseLoadout: LoadoutStart = {
  masters: [],
  singles: [],
  subProducts: [],
};

export type LoadoutDoc = {
  employeeId: string;
  routeDate: string;
  masters: {
    productId: number;
    plannedAmount: number;
    startAmount: number | null;
    finishAmount: number | null;
    unitId: number;
    appMethods: {
      appMethodId: string;
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
};

type Loadout = LoadoutStart & {
  employeeId: string;
  routeDate: string;
};
