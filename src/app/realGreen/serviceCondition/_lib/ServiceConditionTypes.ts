import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Condition } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";

export type ServiceConditionRaw = {
  id: number;
  conditionCodeID: string;
  serviceID: number;
  isPreCondition: boolean;
};

export type ServiceConditionCore = {
  serviceConditionId: number;
  conditionId: string;
  serviceId: number;
  isPreCondition: boolean;
};

export type ServiceConditionDocProps = CreatedUpdated & {
  serviceConditionId: number;
};

export type ServiceConditionDoc = ServiceConditionCore &
  ServiceConditionDocProps;

export type ServiceConditionProps = {
  condition: Condition;
}

export type ServiceCondition = ServiceConditionDoc & ServiceConditionProps;

