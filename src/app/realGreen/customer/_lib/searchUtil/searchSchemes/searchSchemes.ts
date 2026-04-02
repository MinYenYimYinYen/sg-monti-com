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
import { dateStrings } from "@/lib/primatives/dates/dateStrings";
import { AppError } from "@/lib/errors/AppError";

type SearchSchemeParams = {
  season: number;
  schemeParams?: Record<string, unknown>;
};

const activeCustomers = ({
  season,
  schemeParams,
}: SearchSchemeParams): SearchScheme => {
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

const recentProduction = ({ season }: SearchSchemeParams): SearchScheme => {
  const today = dateStrings.today();
  return {
    schemeName: "production",
    steps: [
      createPaginationStep({
        stepName: "services",
        optimizerKey: "recentProductionServices",
        searchCriteria: {
          season: { min: season, max: season },
          servStats: getServiceStatuses(["completed"]),
          updated: dateStrings.padDateRange({ min: today, max: today }, 7),
        },
      }),
      createBatchSizeStep({
        stepName: "programs",
        optimizerKey: "recentProductionPrograms",
        getIds: (pipelineData) => {
          const dupedIds = (pipelineData as ServiceDoc[]).map((s) => s.progId);
          return [...new Set(dupedIds)];
        },
        getSearchCriteria: (ids) => ({
          progIds: ids,
        }),
      }),
      createBatchSizeStep({
        stepName: "customers",
        optimizerKey: "recentProductionCustomers",
        getIds: (pipelineData) => {
          const dupedIds = (pipelineData as ProgramDoc[]).map((p) => p.custId);
          return [...new Set(dupedIds)];
        },
        getSearchCriteria: (ids) => ({
          custIds: ids,
        }),
      }),
    ],
  };
};

const singleCustomer = ({
  season,
  schemeParams,
}: SearchSchemeParams): SearchScheme => {
  const custId = schemeParams?.custId;

  // early return for invalid customer ID
  if (!custId || typeof custId !== "number") {
    return {
      schemeName: "singleCustomer",
      steps: [],
    };
  }

  return {
    schemeName: "singleCustomer",
    steps: [
      createPaginationStep({
        stepName: "customers",
        optimizerKey: "singleCustomer",
        searchCriteria: {
          custIds: [custId],
        },
      }),
      createBatchSizeStep({
        stepName: "programs",
        optimizerKey: "singleCustomerPrograms",
        getIds: (pipelineData) => {
          const dupedIds = (pipelineData as CustomerDoc[]).map((c) => c.custId);
          return [...new Set(dupedIds)];
        },
        getSearchCriteria: (ids) => ({
          custIds: ids,
        }),
      }),
      createBatchSizeStep({
        stepName: "services",
        optimizerKey: "singleCustomerServices",
        getIds: (pipelineData) => {
          const dupedIds = (pipelineData as ProgramDoc[]).map((p) => p.progId);
          return [...new Set(dupedIds)];
        },
        getSearchCriteria: (ids) => ({
          progIds: ids,
        }),
      }),
    ],
  };
};

export const searchScheme = {
  activeCustomers,
  printedCustomers,
  lastSeasonProduction,
  recentProduction,
  singleCustomer,
};
