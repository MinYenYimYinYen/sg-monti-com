import { baseUnitCRM, UnitCRM } from "@/app/realGreen/product/unitConfig/UnitTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export type AppMethodDoc = {
  appMethodId: string;
  description: string;
  speed: number;
  doubleOverlap: boolean;
  width: number;
  flowRate: number;
  flowRateUnitId: number;
};

export type AppMethodProps = {
  flowRateUnit: UnitCRM;
};

export type AppMethod = AppMethodDoc & AppMethodProps;

export const baseAppMethodDoc: AppMethodDoc = {
  appMethodId: baseStrId,
  description: baseStrId,
  speed: 17.5,
  doubleOverlap: false,
  width: 11,
  flowRate: 3,
  flowRateUnitId: baseNumId,
};

export const baseAppMethod: AppMethod = {
  ...baseAppMethodDoc,
  flowRateUnit: baseUnitCRM,
};
