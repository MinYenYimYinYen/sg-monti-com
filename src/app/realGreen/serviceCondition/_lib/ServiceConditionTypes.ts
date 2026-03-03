import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type ServiceConditionRaw = {
  id: number;
  conditionCodeID: string;
  serviceID: number;
  isPreCondition: boolean;
};

export type ServiceConditionCore = {
  serviceConditionId: number;
  conditionCodeId: string;
  serviceId: number;
  isPreCondition: boolean;
};

export type ServiceConditionDocProps = CreatedUpdated & {
  serviceConditionId: number;
};

export type ServiceConditionDoc = ServiceConditionCore &
  ServiceConditionDocProps;

export type ServiceConditionProps = {}

export type ServiceCondition = ServiceConditionDoc & ServiceConditionProps;

