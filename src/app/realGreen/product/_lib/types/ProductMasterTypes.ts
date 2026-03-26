import {
  ProductCommonDocProps,
  ProductCommonProps,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import {
  EquipmentPackage,
  EquipmentPackageDoc,
} from "@/app/equipment/equipmentPackage/EquipmentPackageTypes";

// Re-export for convenience
export type { EquipmentPackage, EquipmentPackageDoc };

export type ProductMasterCore = ProductCore & {
  isProduction: true;
  isMaster: true;
  isMobile: true;
};

export function isProductMasterCore(
  productCore: ProductCore,
): productCore is ProductMasterCore {
  const { isProduction, isMaster, isMobile } = productCore;
  return isProduction && isMaster && isMobile;
}

export type SubProductConfigDoc = {
  subId: number;
  storedRate: number;
};

export type SubProductConfig = SubProductConfigDoc & {
  subProduct: ProductSub;
  rate: number;
};

export type ProductMasterDocProps = CreatedUpdated &
  ProductCommonDocProps & {
    productId: number;
    subProductConfigDocs: SubProductConfigDoc[];
    /** Equipment packages configured for this master product (FK references to EquipmentPackage). */
    equipmentPackageIds: string[];
  };

export type ProductMasterDoc = ProductMasterCore & ProductMasterDocProps;

export type ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[];
  /** Hydrated equipment packages (equipmentIds resolved to Equipment[]). */
  equipmentPackages: EquipmentPackage[];
};

export type ProductMaster = ProductMasterDoc & ProductMasterProps;
