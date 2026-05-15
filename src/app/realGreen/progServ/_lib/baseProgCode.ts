import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import {
  ProgCode,
  ProgCodeDocProps,
} from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ProgCodeUtils } from "@/app/realGreen/progServ/_lib/classes/ProgCodeUtils";
import { buildProgCode } from "@/app/realGreen/progServ/_lib/buildProgCode";

export const baseProgCodeDocProps: ProgCodeDocProps = {
  progCodeId: baseStrId,
  createdAt: "",
  updatedAt: "",
  precludedIds: [],
  prefPriceTableId: null,
  econPriceTableId: null,
  minForPreferred: null,
  isInstallment: false,
  runsInSequence: false,
};

const baseProgCodeNoX: Omit<ProgCode, "x"> = {
  available: true,
  description: "",
  programType: "",
  progDefId: baseNumId,
  unitCode: baseNumId,
  servCodes: [],
  isSpecial: false,
  priceTable: null,
  econPriceTable: null,
  ...baseProgCodeDocProps,
};

export const baseProgCode: ProgCode = {
  ...baseProgCodeNoX,
  x: new ProgCodeUtils(baseProgCodeNoX, buildProgCode),
};
