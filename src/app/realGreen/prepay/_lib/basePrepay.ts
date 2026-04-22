import {
  Prepay,
  PrepayCore,
  PrepayDoc,
  PrepayDocProps,
  PrepayProps,
} from "@/app/realGreen/prepay/PrepayTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const basePrepayCore: PrepayCore = {
  prepayId: baseStrId,
  description: "",
  percent: 0,
};

export const basePrepayDocProps: PrepayDocProps = {
  prepayId: baseStrId,
};

export const basePrepayDoc: PrepayDoc = {
  ...basePrepayCore,
  ...basePrepayDocProps,
};

export const basePrepayProps: PrepayProps = {};

export const basePrepay: Prepay = {
  ...basePrepayDoc,
  ...basePrepayProps,
};
