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
import * as sea from "node:sea";

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
          season: { min: season, max: season },
          statuses: ["9"],
        }),
      }),
      createBatchSizeStep({
        stepName: "services",
        getIds: (pipelineData) =>
          (pipelineData as ProgramDoc[]).map((p) => p.progId),
        getSearchCriteria: (ids) => ({
          progIds: ids,
          season: { min: season, max: season },
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
          season: { min: season, max: season },
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
          season: { min: season - 1, max: season },
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
          season: { min: season - 1, max: season },
          servStats: getServiceStatuses([
            "active",
            "asap",
            "printed",
            "completed",
            "skips",
            "never",
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
          season: { min: season - 1, max: season - 1 },
        },
      }),
      createBatchSizeStep({
        stepName: "services",
        getIds: (pipelineData) =>
          (pipelineData as ProgramDoc[]).map((p) => p.progId),
        getSearchCriteria: (ids) => ({
          progIds: ids,
          season: { min: season - 1, max: season - 1 },
          servStats: getServiceStatuses(["completed"]),
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
