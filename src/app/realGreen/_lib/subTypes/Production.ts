import { UsedProductRemapped } from "@/app/realGreen/_lib/subTypes/UsedProduct";
import { DoneByRemapped } from "@/app/realGreen/_lib/subTypes/DoneByRemapped";
import { ServiceHistory } from "@/app/realGreen/_lib/subTypes/ServiceHistory";

export type ProductionRemapped = ServiceHistory & {
  servId: number;
  usedProducts: UsedProductRemapped[];
  doneBys: DoneByRemapped[];
  invoice: number;
};

export type ProductionHydrate = {};

export type Production = ProductionRemapped & ProductionHydrate;
