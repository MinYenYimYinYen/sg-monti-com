import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";

export type RawProduct = {
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

export type RemappedProduct = {
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

export type MongoProduct = CreatedUpdated & {
  productId: number;
};

export type Product = RemappedProduct & MongoProduct;

export function remapProduct(raw: RawProduct): RemappedProduct {
  return {
    productId: raw.id,
    description: raw.description,
    isLabor: raw.isLabor,
    isMaster: raw.isMaster,
    isNonInventory: raw.isNonInventory,
    isProduction: raw.isProduction,
    isWorkOrder: raw.isWorkOrder,
    categoryId: raw.productCategoryId,
    productCode: raw.productCode,
    unitId: raw.unitofMeasure,
  };
}

export function extendProduct({
  remapped,
  mongo,
}: {
  remapped: RemappedProduct;
  mongo?: MongoProduct;
}): Product {
  return {
    ...remapped,
    createdAt: mongo?.createdAt,
    updatedAt: mongo?.updatedAt,
  } as Product;
}

export function extendProducts({
  remapped,
  mongo,
}: {
  remapped: RemappedProduct[];
  mongo: MongoProduct[];
}): Product[] {
  const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.productId);

  return remapped.map((r) =>
    extendProduct({
      remapped: r,
      mongo: mongoMap.get(r.productId),
    }),
  );
}
