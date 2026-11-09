import {
  RgAccount,
  RgAccountCore,
  RgAccountProps,
} from "@/app/realGreen/rgAccount/RgAccountTypes";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseRgAccountCore: RgAccountCore = {
  rgAccountId: baseStrId,
  rgDescription: "",
};

export const baseRgAccountProps: RgAccountProps = {};

export const baseRgAccount: RgAccount = {
  ...baseRgAccountCore,
  ...baseRgAccountProps,
};
