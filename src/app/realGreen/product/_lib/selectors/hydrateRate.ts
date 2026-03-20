import { SubProductConfigDoc } from "@/app/realGreen/product/_lib/types/ProductMasterTypes";
import { AppMethod } from "@/app/realGreen/product/appMethod/AppMethodTypes";
import { UnitUtils } from "@/app/realGreen/product/unitConfig/UnitUtils";
import { UnitMath } from "@/app/realGreen/product/unitConfig/UnitMath";
import { UnitLabel, AreaUnit, VolumeUnit, WeightUnit } from "@/app/realGreen/product/unitConfig/UnitTypes";

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
      // Project standard: rate is expressed as "volume per 1000 SF (ksf)"
      // Need to normalize area to ksf before calculating rate

      // APPROACH 1: Using UnitUtils (simple, direct conversion)
      // Convert area to ksf, then divide volume by normalized area
      const areaInKsf = UnitUtils.area(
        appMethod.coverage.area,
        appMethod.coverage.areaUnit as AreaUnit["desc"]
      ).to(UnitLabel.ksf);
      const rate = appMethod.coverage.volume / areaInKsf;

      // APPROACH 2: Using UnitMath (dimensional analysis, more robust)
      // Creates a proper "volume per area" quantity and converts to target units
      // Commented out for now, but demonstrates full dimensional tracking
      // const rateCalc = UnitMath.volumePerArea(
      //   appMethod.coverage.volume,
      //   appMethod.coverage.volumeUnit as VolumeUnit["desc"],
      //   appMethod.coverage.area,
      //   appMethod.coverage.areaUnit as AreaUnit["desc"]
      // );
      // const rate = rateCalc.toVolumePerArea(
      //   appMethod.coverage.volumeUnit as VolumeUnit["desc"],
      //   UnitLabel.ksf
      // );

      return rate;
    }
    return subProductConfigDoc.storedRate;
  }
  return subProductConfigDoc.storedRate;
}
