import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

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
  productCategoryId: number;
  productCode: string;
  proposalNotes: string;
  reorderPoint: number | null;
  residentialAccount: string;
  size: string;
  target: string;
  unitCost: number | null;
  unitPrice: number | null;
  unitofMeasure: number;
};

export type ProductCore = {
  productId: number;
  description: string;
  isLabor: boolean;
  isMaster: boolean;
  isNonInventory: boolean;
  isProduction: boolean;
  isWorkOrder: boolean;
  categoryId: number;
  productCode: string; //identifier but not the key!
  unitId: number;
};

export type ProductDocProps = CreatedUpdated & {
  productId: number;
};

export type ProductDoc = ProductCore & ProductDocProps;

export type ProductProps = {};

export type Product = ProductDoc & ProductProps;
