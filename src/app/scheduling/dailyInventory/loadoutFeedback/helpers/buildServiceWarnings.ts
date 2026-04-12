import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceWarnings } from "../LoadoutFeedback";
import { isProductMasterCore } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";

/**
 * Derives per-service warnings from completed services' CRM production data.
 * A warning is added when the ProductMaster "area" row recorded a treated area
 * that differs from service.size, indicating the tablet auto-filled stale data
 * and all sub-product amounts for this service are suspect.
 * Only services with at least one warning are included in the result.
 */
export function buildServiceWarnings(completedServices: Service[]): ServiceWarnings[] {
  const result: ServiceWarnings[] = [];
  for (const service of completedServices) {
    const warnings: string[] = [];
    const masterAreaProduct = service.production?.usedAppProducts?.find(
      (ap) => isProductMasterCore(ap.productCommon),
    );
    if (masterAreaProduct && masterAreaProduct.amount !== service.size) {
      warnings.push(
        `Tablet recorded ${masterAreaProduct.amount} ksf but service size is ${service.size} ksf — amounts may be stale.`,
      );
    }
    if (warnings.length > 0) result.push({ service, warnings });
  }
  return result;
}
