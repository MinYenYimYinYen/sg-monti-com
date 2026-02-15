import { Service, ServiceCore, ServiceDoc } from "../types/ServiceTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { baseProgram } from "./ProgramBase";
import { baseServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

export const baseServiceCore: ServiceCore = {
  servId: baseNumId,
  asapSince: "",
  callAheadId: baseNumId,
  custId: baseNumId,
  discountId: "",
  invoice: baseNumId,
  isPromised: false,
  nextPrice: 0,
  nextSize: 0,
  price: 0,
  size: 0,
  progId: baseNumId,
  season: 0,
  servCodeId: baseStrId,
  status: "",
  techNote: "",
  productionCore: null,
};

export const baseServiceDoc: ServiceDoc = {
  ...baseServiceCore,
  createdAt: "",
  updatedAt: "",
};

export const baseService: Service = {
  ...baseServiceDoc,
  program: baseProgram,
  servCode: baseServCode,
  callAhead: null,
  discount: null,
  production: null,
  productsPlanned: [],
  // productsUsed: [],
};
