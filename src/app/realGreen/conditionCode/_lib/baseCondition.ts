import { baseStrId } from "../../_lib/realGreenConst";
import {
  Condition,
  ConditionCore,
  ConditionDoc,
  ConditionDocProps,
  ConditionProps,
} from "@/app/realGreen/conditionCode/_types/ConditionCode";

export const baseConditionCore: ConditionCore = {
  conditionId: baseStrId,
  desc: baseStrId,
  available: true,
};

export const baseConditionDocProps: ConditionDocProps = {
  conditionId: baseStrId,
  updatedAt: "",
  createdAt: "",
  upsellProgCodeIds: [],
};

export const baseConditionDoc: ConditionDoc = {
  ...baseConditionCore,
  ...baseConditionDocProps,
};

export const baseConditionProps: ConditionProps = {};

export const baseCondition: Condition = {
  ...baseConditionDoc,
  ...baseConditionProps,
};
