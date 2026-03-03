import { Program } from "../types/ProgramTypes";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";
import { baseCustomer } from "./baseCustomer";

import {baseProgCode} from "@/app/realGreen/progServ/_lib/baseProgCode";
import { ProgramUtils } from "@/app/realGreen/customer/_lib/classes/ProgramUtils";

export const baseProgramNoX: Omit<Program, "x"> = {
  avgPrice: 0,
  billingType: "",
  callAheadId: baseNumId,
  custId: baseNumId,
  dateSold: "",
  discountId: "",
  progId: baseNumId,
  isFullProgram: false,
  lastPriceChange: "",
  nextDate: "",
  price: 0,
  progDefId: baseNumId,
  season: 0,
  soldBy: [],
  sourceCodeId: baseNumId,
  status: "",
  techNote: "",
  tempSeq: 0,
  createdAt: "",
  updatedAt: "",
  services: [],
  customer: baseCustomer,
  progCode: baseProgCode,
  callAhead: null,
  discount: null,
};

export const baseProgram: Program = {
  ...baseProgramNoX,
  x: new ProgramUtils(baseProgramNoX),
};
