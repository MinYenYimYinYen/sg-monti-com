import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export type ProductRuleDoc = {
  size: number;
  sizeOperator: "lte" | "gt" | "all";
  productMasterIds: number[];
};

export type ProductRule = ProductRuleDoc & {
  productMasters: ProductMaster[];
};

export const baseProductRuleDoc: ProductRuleDoc = {
  size: 0,
  sizeOperator: "all",
  productMasterIds: [],
};

export const baseProductRule: ProductRule = {
  ...baseProductRuleDoc,
  productMasters: [],
};
