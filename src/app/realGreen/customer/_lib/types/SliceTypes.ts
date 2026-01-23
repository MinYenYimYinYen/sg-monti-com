import {CustomerDoc} from "@/app/realGreen/customer/_lib/types/entities/Customer";
import {ProgramDoc} from "@/app/realGreen/customer/_lib/types/entities/Program";
import {ServiceDoc} from "@/app/realGreen/customer/_lib/types/entities/Service";

export type BaseCustomerState = {
  customerDocs: CustomerDoc[];
  programDocs: ProgramDoc[];
  serviceDocs: ServiceDoc[];
}

export const baseInitialState = {
  customerDocs: [],
  programDocs: [],
  serviceDocs: [],
}