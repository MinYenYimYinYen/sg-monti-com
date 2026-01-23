import {
  ServiceCore,
  ServiceDoc,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

export async function extendServices(
  remapped: ServiceCore[],
): Promise<ServiceDoc[]> {
  //MOCKED
  //code the actual mongo lookup here.
  const withMongo: ServiceDoc[] = remapped.map((serv) => ({
    ...serv,
    createdAt: "",
    updatedAt: "",
  }));
  return withMongo;
}