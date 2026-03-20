import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";

export function hydrateRate({
  subProductConfigDoc,
  appMethodMap,
}: {
  subProductConfigDoc: SubProductConfigDoc;
  appMethodMap: Map<string, AppMethod>;
}) {
  if (subProductConfigDoc.useAppMethod && subProductConfigDoc.appMethodId) {
    const appMethod = appMethodMap.get(subProductConfigDoc.appMethodId);
    if (appMethod) {
      const rate = appMethod.coverage.volume / appMethod.coverage.area;
      return rate;
    }
    return subProductConfigDoc.storedRate;
  }
  return subProductConfigDoc.storedRate;
}
