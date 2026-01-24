import {CustomerDoc} from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import {ProgramDoc} from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import {ServiceDoc} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

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