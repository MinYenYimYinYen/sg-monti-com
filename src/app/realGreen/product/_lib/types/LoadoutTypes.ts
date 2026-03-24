import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import {
  ProductMaster,
  SubProductConfig,
} from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";

type AmountDetail = {
  plannedAmount: number;
  startAmount: number | null;
  finishAmount: number | null;
  unit: UnitCRM;
}


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
}

export const baseLoadout: Loadout = { masters: [] };

