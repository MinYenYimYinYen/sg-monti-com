import { Product } from "@/app/realGreen/product/ProductTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseProduct: Product = {
  productId: baseNumId,
  updatedAt: "",
  createdAt: "",
  isProduction: false,
  isLabor: false,
  isMaster: false,
  isNonInventory: false,
  categoryId: baseNumId,
  productCode: baseStrId,
  description: baseStrId,
  unitId: baseNumId,
  isWorkOrder: false,
};
