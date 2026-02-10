import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export type ProductRuleDoc = {
  size: number;
  sizeOperator: "lte" | "gt" | "all";
  productSingleIds: number[];
  productMasterIds: number[];
};

export type ProductRule = ProductRuleDoc & {
  productSingles: ProductSingle[];
  productMasters: ProductMaster[];
};

export const baseProductRuleDoc: ProductRuleDoc = {
  size: 0,
  sizeOperator: "all",
  productSingleIds: [],
  productMasterIds: [],
};

export const baseProductRule: ProductRule = {
  ...baseProductRuleDoc,
  productSingles: [],
  productMasters: [],
};
