import { baseStrId } from "../../_lib/realGreenConst";
import { Condition, ConditionDocProps } from "@/app/realGreen/conditionCode/_types/ConditionCode";

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
