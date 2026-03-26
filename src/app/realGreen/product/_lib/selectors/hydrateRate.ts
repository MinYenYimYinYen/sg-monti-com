import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { AppMethod } from "@/app/appMethod/AppMethodTypes";

/**
 * Returns the effective rate for a sub-product config.
 *
 * AppMethod association has moved to the master level (equipmentScenarios).
 * Sub-configs now only store a storedRate — this function simply returns it.
 *
 * The appMethodMap parameter is kept for API compatibility but is no longer used here.
 */
export function hydrateRate({
  subProductConfigDoc,
}: {
  subProductConfigDoc: SubProductConfigDoc;
  appMethodMap: Map<string, AppMethod>;
}) {
  return subProductConfigDoc.storedRate;
}
