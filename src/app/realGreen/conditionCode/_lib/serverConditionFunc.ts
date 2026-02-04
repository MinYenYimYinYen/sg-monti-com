import {
  ConditionRaw,
  ConditionCore,
  ConditionDoc,
  ConditionDocProps,
} from "@/app/realGreen/conditionCode/_types/ConditionCode";
import { ConditionDocPropsModel } from "@/app/realGreen/conditionCode/_models/ConditionDocPropsModel";
import { baseConditionDocProps } from "./baseCondition";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

function remapCondition(raw: ConditionRaw): ConditionCore {
  return {
    conditionId: raw.id,
    desc: raw.description,
    available: raw.available,
  };
}

export function remapConditions(raw: ConditionRaw[]): ConditionCore[] {
  return raw.map((r) => remapCondition(r));
}

export async function extendConditions(
  remapped: ConditionCore[],
): Promise<ConditionDoc[]> {
  return extendEntities<ConditionCore, ConditionDocProps, ConditionDoc>({
    cores: remapped,
    model: ConditionDocPropsModel,
    idField: "conditionId",
    baseDocProps: baseConditionDocProps,
  });
}
