import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import {
  ServCode,
  ServCodeCore,
  ServCodeDoc,
  ServCodeDocProps,
  ServCodeProps,
} from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { baseProgCode } from "@/app/realGreen/progServ/_lib/baseProgCode";

export const baseServCodeCore: ServCodeCore = {
  servCodeId: baseStrId,
  isServiceCall: false,
  available: true,
  longName: "",
  invoiceMessage: "",
}

export const baseServCodeDocProps: ServCodeDocProps = {
  servCodeId: baseStrId,
  dateRange: { min: "", max: "" },
  alwaysAsap: false,
  productRuleDocs: [],
  createdAt: "",
  updatedAt: "",
}

export const baseServCodeDoc: ServCodeDoc = {
  ...baseServCodeCore,
  ...baseServCodeDocProps
}

export const baseServCodeProps: ServCodeProps = {
  progCode: baseProgCode,
  progCodeId: baseStrId,
  services: [],
  isSpecial: false,
  productRules: [],
}

export const baseServCode: ServCode = {
  ...baseServCodeDoc,
  ...baseServCodeProps
}





