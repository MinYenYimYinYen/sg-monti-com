import { SearchScheme } from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/types/SearchScheme";

import {
  createBatchSizeStep,
  createPaginationStep,
} from "./schemeExecution/stepFactories";
import { getServiceStatuses } from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { CustomerDoc } from "../../entities/types/CustomerTypes";
import { ProgramDoc } from "../../entities/types/ProgramTypes";
import { ServiceDoc } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceSearchCriteria } from "../searchCriteria/types/ServSearch";

type SearchSchemeParams = {
  season: number;
};

const activeCustomers = ({ season }: SearchSchemeParams): SearchScheme => {
  return {
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
          season,
          statuses: ["9"],
        }),
      }),
      createBatchSizeStep({
        stepName: "services",
        getIds: (pipelineData) =>
          (pipelineData as ProgramDoc[]).map((p) => p.progId),
        getSearchCriteria: (ids) => ({
          progIds: ids,
          season,
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
};

const printedCustomers = ({ season }: SearchSchemeParams): SearchScheme => {
  return {
    schemeName: "printedCustomers",
    steps: [
      createPaginationStep({
        stepName: "services",
        optimizerKey: "initialServices",
        searchCriteria: {
          servStats: getServiceStatuses(["printed"]),
          season,
        } as ServiceSearchCriteria,
      }),
      createBatchSizeStep({
        stepName: "customers",
        getIds: (pipelineData) =>
          (pipelineData as ServiceDoc[]).map((s) => s.custId),
        getSearchCriteria: (ids) => ({
          custIds: ids,
          season,
          statuses: ["9"],
        }),
      }),
      createBatchSizeStep({
        stepName: "programs",
        getIds: (pipelineData) =>
          (pipelineData as CustomerDoc[]).map((c) => c.custId),
        getSearchCriteria: (ids) => ({
          custIds: ids,
          season,
          statuses: ["9"],
        }),
      }),
      createBatchSizeStep({
        stepName: "services",
        optimizerKey: "relatedServices",
        getIds: (pipelineData) =>
          (pipelineData as ProgramDoc[]).map((p) => p.progId),
        getSearchCriteria: (ids) => ({
          progIds: ids,
          season,
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
};

const lastSeasonProduction = ({ season }: SearchSchemeParams): SearchScheme => {
  return {
    schemeName: "lastSeasonProduction",
    steps: [
      createPaginationStep({
        stepName: "programs",
        optimizerKey: "lastSeasonPrograms",
        searchCriteria: {
          season: season - 1,
        },
      }),
      createBatchSizeStep({
        stepName: "services",
        getIds: (pipelineData) =>
          (pipelineData as ProgramDoc[]).map((p) => p.progId),
        getSearchCriteria: (ids) => ({
          progIds: ids,
          season: season -1,
          servStats: getServiceStatuses(["completed"])
        }),
      }),
      createBatchSizeStep({
        stepName: "customers",
        getIds: (pipelineData) => {
          const dupedIds = (pipelineData as ServiceDoc[]).map((s) => s.custId);
          return [...new Set(dupedIds)];
        },
        getSearchCriteria: (ids) => ({
          custIds: ids,
        }),
      }),
    ],
  };
};

export const searchScheme = {
  activeCustomers,
  printedCustomers,
  lastSeasonProduction,
};
