import {
  ProductCommonDocProps,
  ProductCommonProps,
  ProductCore,
} from "@/app/realGreen/product/_lib/types/ProductTypes";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import {
  EquipmentScenario,
  EquipmentScenarioDoc,
} from "@/app/equipment/EquipmentTypes";

// Re-export for convenience
export type { EquipmentScenario, EquipmentScenarioDoc };

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
    /** Equipment scenarios configured for this master product. */
    equipmentScenarioDocs: EquipmentScenarioDoc[];
  };

export type ProductMasterDoc = ProductMasterCore & ProductMasterDocProps;

export type ProductMasterProps = ProductCommonProps & {
  subProductConfigs: SubProductConfig[];
  /** Hydrated equipment scenarios (appMethodId resolved to AppMethod). */
  equipmentScenarios: EquipmentScenario[];
};

export type ProductMaster = ProductMasterDoc & ProductMasterProps;
