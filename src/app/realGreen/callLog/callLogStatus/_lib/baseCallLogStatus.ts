import { CallLogStatus } from "@/app/realGreen/callLog/callLogStatus/CallLogStatusTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseCallLogStatus: CallLogStatus = {
  code: baseStrId,
  description: baseStrId,
  resolved: false,
  isDefault: false,
  createdAt: "",
  updatedAt: "",
};
