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
import { Equipment } from "@/app/equipment/EquipmentTypes";

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
  /** FK → Equipment[]. Empty array = standalone (not mixed into any equipment's water). */
  mixedByEquipmentIds: string[];
};

type SubProductConfigProps = {
  /** Hydrated from mixedByEquipmentIds. Empty array when standalone. */
  mixedByEquipments: Equipment[];
};

export type SubProductConfig = SubProductConfigDoc &
  SubProductConfigProps & {
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
