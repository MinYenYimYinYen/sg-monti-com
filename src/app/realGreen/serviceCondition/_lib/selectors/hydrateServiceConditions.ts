import {
  ServiceCondition,
  ServiceConditionDoc,
} from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";
import { ConditionDoc } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { baseCondition } from "@/app/realGreen/conditionCode/_lib/baseCondition";

export function hydrateServiceConditions({
  serviceConditionDocs,
  conditionDocMap,
}: {
  serviceConditionDocs: ServiceConditionDoc[];
  conditionDocMap: Map<string, ConditionDoc>;
}): ServiceCondition[] {
  const serviceConditions: ServiceCondition[] = serviceConditionDocs.map(
    (doc) => {
      const serviceCondition: ServiceCondition = {
        ...doc,
        condition: conditionDocMap.get(doc.conditionId) ?? baseCondition,
      };
      return serviceCondition;
    },
  );
  return serviceConditions;
}
