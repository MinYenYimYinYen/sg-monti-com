import { UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { ProductUnitConfig } from "@/app/realGreen/product/unitConfig/ProductUnitConfigTypes";
import { UnitConfigDisplay } from "@/app/realGreen/product/unitConfig/UnitConfigDisplay";

export type ProductRaw = {
  anyBranch: boolean;
  availableOnHandheld: boolean;
  canUpdateCost: boolean;
  commercialAccount: string;
  composition: string;
  cost: number | null;
  crewNotes: string;
  description: string;
  descriptionFrench: string;
  descriptionSpanish: string;
  epaNumber: string;
  id: number;
  isLabor: boolean;
  isMaster: boolean;
  isNonInventory: boolean;
  isProduction: boolean;
  isPurchaseOrderRequired: boolean;
  isWorkOrder: boolean;
  markup: number | null;
  onHand: number | null;
  onHold: number | null;
  productCategoryId: number | null;
  productCode: string;
  proposalNotes: string;
  reorderPoint: number | null;
  residentialAccount: string;
  size: string;
  target: string;
  unitCost: number | null;
  unitPrice: number | null;
  unitofMeasure: number | null;
};

export type ProductCore = {
  productId: number;
  description: string;
  isLabor: boolean;
  isMaster: boolean;
  isNonInventory: boolean;
  isProduction: boolean;
  isMobile: boolean;
  isWorkOrder: boolean;
  categoryId: number;
  productCode: string; //identifier but not the key!
  unitId: number;
};

export type ProductCommonDocProps = {
  productId: number;
  category: string;
  unit: UnitCRM;
}

export type ProductCommonDoc = ProductCore & ProductCommonDocProps;

export type ProductCommonProps = {
  productType: "master" | "single" | "sub" | "other";
  unitConfig: ProductUnitConfig;
  unitConfigDisplay: UnitConfigDisplay;
}

export type ProductCommon = ProductCommonDoc & ProductCommonProps;




