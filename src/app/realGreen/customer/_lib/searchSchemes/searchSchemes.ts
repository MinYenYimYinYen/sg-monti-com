import { SearchScheme } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchScheme";

import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchTypes/CustSearch";

import {
  CustomerRaw,
  CustomerRemapped,
  CustomerWithMongo,
  extendCustomers,
  remapCustomers,
} from "@/app/realGreen/customer/_lib/types/Customer";
import {
  createBatchSizeStep,
  createPaginationStep,
} from "../func/stepFactories";
import { remapProgSearch } from "@/app/realGreen/customer/_lib/searchTypes/ProgSearch";
import {
  extendPrograms,
  ProgramRaw,
  ProgramRemapped,
  ProgramWithMongo,
  remapPrograms,
} from "../types/Program";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchTypes/ServSearch";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import {
  extendServices,
  remapServices,
  ServiceRaw,
  ServiceRemapped,
} from "@/app/realGreen/customer/_lib/types/Service";

const activeCustomers: SearchScheme = {
  name: "activeCustomers",
  steps: [
    createPaginationStep({
      stepName: "customers",
      getSearchCriteria: remapCustSearch({ statuses: ["9"] }),
      remapFn: (data) => remapCustomers(data as CustomerRaw[]),
      mongoFn: async (data) =>
        await extendCustomers(data as CustomerRemapped[]),
      rgApiPath: { path: "/Customer/Search" },
    }),
    createBatchSizeStep({
      stepName: "programs",
      getIds: (prevData) =>
        (prevData as CustomerWithMongo[]).map((c) => c.custId),
      getSearchCriteria: (ids) =>
        remapProgSearch({
          custIds: ids,
          season: 2026,
          statuses: ["9"],
        }),
      remapFn: (data) => remapPrograms(data as ProgramRaw[]),
      mongoFn: async (data) => await extendPrograms(data as ProgramRemapped[]),
      rgApiPath: { path: "/Program/Search" },
    }),
    createBatchSizeStep({
      stepName: "services",
      getIds: (prevData) =>
        (prevData as ProgramWithMongo[]).map((p) => p.progId),
      getSearchCriteria: (ids) =>
        remapServSearch({
          progIds: ids,
          season: 2026,
          servStats: getServiceStatuses([
            "active",
            "asap",
            "printed",
            "completed",
          ]),
        }),
      rgApiPath: { path: "/Service/Search" as any },
      remapFn: (data) => remapServices(data as ServiceRaw[]),
      mongoFn: async (data) => await extendServices(data as ServiceRemapped[]),
    }),
  ],
};

export const searchScheme = { activeCustomers };
