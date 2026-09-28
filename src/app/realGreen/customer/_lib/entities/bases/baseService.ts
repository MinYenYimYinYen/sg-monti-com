import {
  Service,
  ServiceCore,
  ServiceDoc,
} from "../types/ServiceTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { baseProgram } from "./baseProgram";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";
import { baseLoadout } from "@/app/loadout/LoadoutTypes";
import { AssignmentUtils } from "@/app/assignment/AssignmentUtils";
import { baseServCode } from "@/app/realGreen/progServ/_lib/baseServCode";

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
  round: null,
};

export const baseServiceDoc: ServiceDoc = baseServiceCore;

export const baseAssignmentUtils = new AssignmentUtils([]);

export const baseService: Service = {
  x: new ServiceUtils({
    ...baseServiceDoc,
    program: baseProgram,
    servCode: baseServCode,
    callAhead: null,
    discount: null,
    production: null,
    assignments: baseAssignmentUtils,
    promise: null,
    promiseIssues: [],
    loadoutInventory: baseLoadout,
    eta: null,
    priorityService: null,
  }),

  ...baseServiceDoc,
  program: baseProgram,
  servCode: baseServCode,
  callAhead: null,
  discount: null,
  production: null,
  assignments: baseAssignmentUtils,
  promise: null,
  promiseIssues: [],
  loadoutInventory: baseLoadout,
  eta: null,
  priorityService: null,
};
