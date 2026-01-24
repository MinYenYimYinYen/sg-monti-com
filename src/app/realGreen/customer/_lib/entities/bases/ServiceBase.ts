import { Service } from "../types/ServiceTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { baseProgram } from "./ProgramBase";
import { baseServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

export const baseService: Service = {
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
  servCodeId: baseStrId,
  status: "",
  season: 0,
  techNote: "",
  production: null,
  createdAt: "",
  updatedAt: "",
  program: baseProgram,
  servCode: baseServCode,
};
