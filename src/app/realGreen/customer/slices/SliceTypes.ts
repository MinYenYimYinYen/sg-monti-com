import {CustomerDoc} from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import {ProgramDoc} from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import {ServiceDoc} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

// BaseCustomerState: Used by source slices (active, printed, lastSeason)
// These receive arrays from the API and store them as arrays
export type BaseCustomerState = {
  customerDocs: CustomerDoc[];
  programDocs: ProgramDoc[];
  serviceDocs: ServiceDoc[];
}

export const baseInitialState: BaseCustomerState = {
  customerDocs: [],
  programDocs: [],
  serviceDocs: [],
}

// CentralCustomerState: Used by centralCustomerSlice only
// Uses Maps for efficient merging and deduplication
export type CentralCustomerStateData = {
  CustDocMap: Map<number, CustomerDoc>;
  ProgDocMap: Map<number, ProgramDoc>;
  ServDocMap: Map<number, ServiceDoc>;
}

export const centralInitialState: CentralCustomerStateData = {
  CustDocMap: new Map(),
  ProgDocMap: new Map(),
  ServDocMap: new Map(),
}