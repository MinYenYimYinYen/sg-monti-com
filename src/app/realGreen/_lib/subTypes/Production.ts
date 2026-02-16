import {
  AppProduct,
  AppProductCore,
} from "@/app/realGreen/_lib/subTypes/AppProduct";
import { DoneBy, DoneByCore } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { ServiceHistory } from "@/app/realGreen/_lib/subTypes/ServiceHistory";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

export type ProductionCore = ServiceHistory & {
  servId: number;
  usedAppProductCores: AppProductCore[];
  doneByCores: DoneByCore[];
  invoice: number;
};

export type ProductionProps = {
  usedAppProducts: AppProduct[];
  doneBys: DoneBy[];
  serviceDoc: ServiceDoc;
};

export type Production = ProductionCore & ProductionProps;
