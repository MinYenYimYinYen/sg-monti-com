import { ProductSingle } from "@/app/realGreen/product/_lib/types/ProductSingleTypes";
import { ProductMaster } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

export type ServCodeProductDoc = {
  size: number;
  sizeOperator: "lte" | "gt" | "all";
  productSingleIds: number[];
  productMasterIds: number[];
};

export type ServCodeProduct = ServCodeProductDoc & {
  productSingles: ProductSingle[];
  productMasters: ProductMaster[];
};

// Here's the idea:
// ServCodeProductDoc allows for services to access which products should be
// used based on the service size.
// We can configure the sizeOperator
// If it's all then whichever products are in the arrays will apply to that service.
// if it's lte then if service size is less they apply, etc.
//
// Next, we can extend service hydrator to determine the products to be used
// on the service


