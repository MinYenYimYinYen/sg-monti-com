import {
  Assignment,
  AssignmentDoc,
  AssignmentProps,
  Service,
  ServiceCore,
  ServiceDoc,
  ServiceDocProps,
} from "../types/ServiceTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { baseProgram } from "./baseProgram";
import { baseServCode } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { baseEmployee } from "@/app/realGreen/employee/_lib/baseEmployee";
import { ServiceUtils } from "@/app/realGreen/customer/_lib/classes/ServiceUtils";

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

export const baseServiceDocProps: ServiceDocProps = {
  servId: baseNumId,
  assignments: [],
  createdAt: "",
  updatedAt: "",
};

export const baseServiceDoc: ServiceDoc = {
  ...baseServiceCore,
  ...baseServiceDocProps,
};

export const baseAssignmentDoc: AssignmentDoc = {
  servId: baseNumId,
  employeeId: "",
  schedDate: "",
  status: "",
};

export const baseAssignmentProps: AssignmentProps = {
  employee: baseEmployee,
};

export const baseAssignment: Assignment = {
  ...baseAssignmentDoc,
  ...baseAssignmentProps,
};

export const baseService: Service = {
  x: new ServiceUtils({
    ...baseServiceDoc,
    program: baseProgram,
    servCode: baseServCode,
    callAhead: null,
    discount: null,
    production: null,
    productsPlanned: [],
    lastAssigned: baseAssignment,
    promise: null,
    promiseIssues: [],
  }),

  ...baseServiceDoc,
  program: baseProgram,
  servCode: baseServCode,
  callAhead: null,
  discount: null,
  production: null,
  productsPlanned: [],
  lastAssigned: baseAssignment,
  promise: null,
  promiseIssues: [],
};
