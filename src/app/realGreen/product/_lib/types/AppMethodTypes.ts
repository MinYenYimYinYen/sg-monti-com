import { ProductSub } from "@/app/realGreen/product/_lib/types/ProductSubTypes";
import { Unit } from "@/app/realGreen/product/_lib/types/UnitTypes";

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
