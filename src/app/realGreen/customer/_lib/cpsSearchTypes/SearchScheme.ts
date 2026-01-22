import { SearchOptimizer } from "./SearchOptimizer";
import {
  CustomerRaw,
  CustomerCore,
  CustomerDoc,
} from "@/app/realGreen/customer/_lib/types/Customer";
import {
  ProgramRaw,
  ProgramCore,
  ProgramDoc,
} from "@/app/realGreen/customer/_lib/types/Program";
import {
  ServiceRaw,
  ServiceCore,
  ServiceDoc,
} from "@/app/realGreen/customer/_lib/types/Service";
import {
  CustomerSearchRaw,
  CustomerSearchCriteria,
} from "@/app/realGreen/customer/_lib/searchTypes/CustSearch";
import {
  ProgramSearchRaw,
  ProgramSearchCriteria,
} from "../searchTypes/ProgSearch";
import {
  ServiceSearchRaw,
  ServiceSearchCriteria,
} from "../searchTypes/ServSearch";

export type RawData = CustomerRaw[] | ProgramRaw[] | ServiceRaw[];

export type PipelineDataCore =
  | CustomerCore[]
  | ProgramCore[]
  | ServiceCore[];

export type PipelineData =
  | CustomerDoc[]
  | ProgramDoc[]
  | ServiceDoc[];

export type SearchCriteriaRaw =
  | CustomerSearchRaw
  | ProgramSearchRaw
  | ServiceSearchRaw;

export type SearchCriteria =
  | CustomerSearchCriteria
  | ProgramSearchCriteria
  | ServiceSearchCriteria;

export type StepContext = {
  pipelineData: PipelineData | null; // Data from the previous step
  optimizer: SearchOptimizer; // Optimization stats for this step
};

export type StepResult = {
  data: PipelineData;
  metrics: {
    calls: number;
    durationMs: number;
  };
  // The step calculates its own optimization updates
  optimizationUpdate?: Partial<SearchOptimizer>;
};

export type OptimizationStrategyType = "pagination" | "batchSize";

export type SearchStep = {
  stepName: "customers" | "programs" | "services";
  // Enforce strategy at definition time to match the optimizer
  optimizationStrategy: OptimizationStrategyType;
  run: (ctx: StepContext) => AsyncGenerator<StepResult>;
};

export type SearchScheme = {
  schemeName: string;
  steps: SearchStep[];
};
