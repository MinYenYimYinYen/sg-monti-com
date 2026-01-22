import { SearchScheme } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchScheme";

import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchTypes/CustSearch";

import {
  CustomerRaw,
  CustomerCore,
  CustomerDoc,
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
  ProgramCore,
  ProgramDoc,
  remapPrograms,
} from "../types/Program";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchTypes/ServSearch";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import {
  extendServices,
  remapServices,
  ServiceRaw,
  ServiceCore,
  ServiceDoc,
} from "@/app/realGreen/customer/_lib/types/Service";

const activeCustomers: SearchScheme = {
  schemeName: "activeCustomers",
  steps: [
    createPaginationStep({
      stepName: "customers",
      getSearchCriteria: remapCustSearch({ statuses: ["9"] }),
      remapFn: (data) => remapCustomers(data as CustomerRaw[]),
      mongoFn: async (data) =>
        await extendCustomers(data as CustomerCore[]),
      rgApiPath: { path: "/Customer/Search" },
    }),
    createBatchSizeStep({
      stepName: "programs",
      getIds: (pipelineData) =>
        (pipelineData as CustomerDoc[]).map((c) => c.custId),
      getSearchCriteria: (ids) =>
        remapProgSearch({
          custIds: ids,
          season: 2026,
          statuses: ["9"],
        }),
      remapFn: (data) => remapPrograms(data as ProgramRaw[]),
      mongoFn: async (data) => await extendPrograms(data as ProgramCore[]),
      rgApiPath: { path: "/Program/Search" },
    }),
    createBatchSizeStep({
      stepName: "services",
      getIds: (pipelineData) =>
        (pipelineData as ProgramDoc[]).map((p) => p.progId),
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
      mongoFn: async (data) => await extendServices(data as ServiceCore[]),
    }),
  ],
};

export const searchScheme = { activeCustomers };
