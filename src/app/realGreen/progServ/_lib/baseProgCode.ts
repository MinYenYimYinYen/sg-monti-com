import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import {
  ProgCode,
  ProgCodeDocProps,
} from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

export const baseProgCodeDocProps: ProgCodeDocProps = {
  progCodeId: baseStrId,
  createdAt: "",
  updatedAt: "",
  precludedIds: [],
}

export const baseProgCode: ProgCode = {
  available: true,
  description: "",
  programType: "",
  progDefId: baseNumId,
  unitCode: baseNumId,
  servCodes: [],
  isSpecial: false,
  ...baseProgCodeDocProps
};