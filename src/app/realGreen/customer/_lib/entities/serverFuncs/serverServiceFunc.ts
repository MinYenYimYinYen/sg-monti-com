import {
  ServiceCore,
  ServiceDoc,
  ServiceDocProps,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";
import { baseServiceDocProps } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { ServiceDocPropsModel } from "@/app/realGreen/customer/_lib/models/ServiceDocPropsModel";

export async function extendServices(
  cores: ServiceCore[],
): Promise<ServiceDoc[]> {
  return extendEntities<ServiceCore, ServiceDocProps, ServiceDoc>({
    cores,
    model: ServiceDocPropsModel,
    idField: "servId",
    baseDocProps: baseServiceDocProps,
  });
}
