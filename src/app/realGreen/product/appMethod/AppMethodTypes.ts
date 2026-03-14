import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { baseUnit, Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

type AppMethod = {
  appMethodId: string;
  description: string;
  speed: number;
  doubleOverlap: boolean;
  width: number;
  flowRate: number;
  flowRateUnit: Unit;
  carrier: ProductSub | null; // Would be water or null
}

const baseAppMethod: AppMethod = {
  appMethodId: baseStrId,
  description: baseStrId,
  speed: 0,
  doubleOverlap: false,
  width: 0,
  flowRate: 0,
  flowRateUnit: baseUnit,
  carrier: null,
}
