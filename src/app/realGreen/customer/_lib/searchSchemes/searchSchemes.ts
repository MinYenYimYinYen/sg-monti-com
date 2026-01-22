import { SearchScheme } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchScheme";

import { CustomerDoc } from "@/app/realGreen/customer/_lib/types/Customer";
import {
  createBatchSizeStep,
  createPaginationStep,
} from "../func/stepFactories";
import { ProgramDoc } from "../types/Program";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";

const activeCustomers: SearchScheme = {
  schemeName: "activeCustomers",
  steps: [
    createPaginationStep({
      stepName: "customers",
      searchCriteria: { statuses: ["9"] },
    }),
    createBatchSizeStep({
      stepName: "programs",
      getIds: (pipelineData) =>
        (pipelineData as CustomerDoc[]).map((c) => c.custId),
      getSearchCriteria: (ids) => ({
        custIds: ids,
        season: 2026,
        statuses: ["9"],
      }),
    }),
    createBatchSizeStep({
      stepName: "services",
      getIds: (pipelineData) =>
        (pipelineData as ProgramDoc[]).map((p) => p.progId),
      getSearchCriteria: (ids) => ({
        progIds: ids,
        season: 2026,
        servStats: getServiceStatuses([
          "active",
          "asap",
          "printed",
          "completed",
        ]),
      }),
    }),
  ],
};

export const searchScheme = { activeCustomers };
