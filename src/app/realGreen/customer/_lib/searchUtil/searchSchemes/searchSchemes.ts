import { SearchScheme } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/types/SearchScheme";

import {
  createBatchSizeStep,
  createPaginationStep,
} from "./schemeExecution/stepFactories";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CustomerDoc } from "../../entities/types/CustomerTypes";
import { ProgramDoc } from "../../entities/types/ProgramTypes";

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
