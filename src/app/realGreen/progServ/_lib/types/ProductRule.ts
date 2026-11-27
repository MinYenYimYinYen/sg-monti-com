export type ProductRuleDoc = {
  size: number;
  sizeOperator: "lte" | "gt" | "all";
  productMasterIds: number[];
};

export type ProductRule = ProductRuleDoc & {
  desc: string;
};

export const baseProductRuleDoc: ProductRuleDoc = {
  size: 0,
  sizeOperator: "all",
  productMasterIds: [],
};

export const baseProductRule: ProductRule = {
  ...baseProductRuleDoc,
  desc: "",
};
