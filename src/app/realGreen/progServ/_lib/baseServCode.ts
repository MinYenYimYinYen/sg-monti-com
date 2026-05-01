import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import {
  ServCode,
  ServCodeCore,
  ServCodeDoc,
  ServCodeDocProps,
} from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { baseProgCode } from "@/app/realGreen/progServ/_lib/baseProgCode";
import { ServCodeUtils } from "@/app/realGreen/progServ/_lib/classes/ServCodeUtils";
import { dateStrings } from "@/lib/primatives/dates/dateStrings";

export const baseServCodeCore: ServCodeCore = {
  servCodeId: baseStrId,
  isServiceCall: false,
  available: true,
  longName: "",
  name: "",
  invoiceMessage: "",
};

export const baseServCodeDocProps: ServCodeDocProps = {
  servCodeId: baseStrId,
  dateRange: { min: dateStrings.today(), max: dateStrings.today() },
  alwaysAsap: false,
  productRuleDocs: [],
  callAheadTag: null,
  createdAt: "",
  updatedAt: "",
};

export const baseServCodeDoc: ServCodeDoc = {
  ...baseServCodeCore,
  ...baseServCodeDocProps,
};

const baseServCodeNoX: Omit<ServCode, "x"> = {
  ...baseServCodeDoc,
  progCode: baseProgCode,
  progCodeId: baseStrId,
  isSpecial: false,
  productRules: [],
  assignedTo: [],
};

export const baseServCode: ServCode = {
  ...baseServCodeNoX,
  x: new ServCodeUtils(baseServCodeNoX),
};
