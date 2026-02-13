import {
  AppProduct,
  AppProductCore,
} from "@/app/realGreen/_lib/subTypes/AppProduct";
import { DoneByRemapped } from "@/app/realGreen/_lib/subTypes/DoneByRemapped";
import { ServiceHistory } from "@/app/realGreen/_lib/subTypes/ServiceHistory";

export type ProductionCore = ServiceHistory & {
  servId: number;
  usedAppProductCores: AppProductCore[];
  doneBys: DoneByRemapped[];
  invoice: number;
};

export type ProductionProps = {
  usedAppProducts: AppProduct[];
};

export type Production = ProductionCore & ProductionProps;
