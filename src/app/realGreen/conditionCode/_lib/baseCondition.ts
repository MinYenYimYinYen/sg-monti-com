import { baseStrId } from "../../_lib/realGreenConst";
import { Condition, ConditionDocProps } from "../types/ConditionCode";

export const baseConditionDocProps: ConditionDocProps = {
  conditionId: baseStrId,
  updatedAt: "",
  createdAt: "",
  upsellProgCodeIds: [],
};

export const baseCondition: Condition = {
  ...baseConditionDocProps,
  desc: baseStrId,
  available: true,
};
