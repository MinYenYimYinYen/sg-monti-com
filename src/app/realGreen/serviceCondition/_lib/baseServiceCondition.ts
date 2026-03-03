import {
  ServiceCondition,
  ServiceConditionCore,
  ServiceConditionDoc,
  ServiceConditionDocProps,
  ServiceConditionProps,
} from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { baseCondition } from "@/app/realGreen/conditionCode/_lib/baseCondition";

export const baseServiceConditionCore: ServiceConditionCore = {
  serviceConditionId: baseNumId,
  serviceId: baseNumId,
  conditionId: baseStrId,
  isPreCondition: false,
};

export const baseServiceConditionDocProps: ServiceConditionDocProps = {
  serviceConditionId: baseNumId,
  createdAt: "",
  updatedAt: "",
};

export const baseServiceConditionDoc: ServiceConditionDoc = {
  ...baseServiceConditionCore,
  ...baseServiceConditionDocProps,
};

export const baseServiceConditionProps: ServiceConditionProps = {
  condition: baseCondition,
};

export const baseServiceCondition: ServiceCondition = {
  ...baseServiceConditionDoc,
  ...baseServiceConditionProps,
};
