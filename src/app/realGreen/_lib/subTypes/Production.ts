import {
  ProductionProduct,
  ProductionProductCore,
} from "@/app/realGreen/_lib/subTypes/ProductionProduct";
import { DoneBy, DoneByCore } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { ServiceHistory } from "@/app/realGreen/_lib/subTypes/ServiceHistory";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceCondition } from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";

export type ProductionCore = ServiceHistory & {
  servId: number;
  productsUsedCores: ProductionProductCore[];
  doneByCores: DoneByCore[];
  invoice: number;
};

export type ProductionProps = {
  productsUsed: ProductionProduct[];
  doneBys: DoneBy[];
  serviceDoc: ServiceDoc;
  serviceConditions: ServiceCondition[];
};

export type Production = ProductionCore & ProductionProps;
