import {
  ServiceConditionCore,
  ServiceConditionDoc,
  ServiceConditionDocProps,
  ServiceConditionRaw,
} from "@/app/realGreen/serviceCondition/_lib/ServiceConditionTypes";
import { baseServiceConditionDocProps } from "@/app/realGreen/serviceCondition/_lib/baseServiceCondition";

export function remapServiceConditions(
  raw: ServiceConditionRaw[],
): ServiceConditionCore[] {
  return raw.map((sc) => {
    const core: ServiceConditionCore = {
      serviceConditionId: sc.id,
      conditionCodeId: sc.conditionCodeID,
      serviceId: sc.serviceID,
      isPreCondition: sc.isPreCondition,
    };
    return core;
  });
}

export async function extendServiceConditions(
  cores: ServiceConditionCore[],
): Promise<ServiceConditionDoc[]> {
  const docProps: ServiceConditionDocProps[] = cores.map((core) => {
    console.warn("extendServiceConditions is not really implemented yet.");
    return baseServiceConditionDocProps;
  });
  const docs: ServiceConditionDoc[] = cores.map((core, index) => {
    return {
      ...core,
      ...docProps[index],
    };
  });
  return docs;
}
