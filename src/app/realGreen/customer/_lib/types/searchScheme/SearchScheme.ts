import { SearchOptimizer } from "./SearchOptimizer";
import {
  CustomerRaw,
  CustomerCore,
  CustomerDoc,
} from "@/app/realGreen/customer/_lib/types/entities/Customer";
import {
  ProgramRaw,
  ProgramCore,
  ProgramDoc,
} from "@/app/realGreen/customer/_lib/types/entities/Program";
import {
  ServiceRaw,
  ServiceCore,
  ServiceDoc,
} from "@/app/realGreen/customer/_lib/types/entities/Service";
import {
  CustomerSearchRaw,
  CustomerSearchCriteria,
} from "@/app/realGreen/customer/_lib/types/searchCriteria/CustSearch";
import {
  ProgramSearchRaw,
  ProgramSearchCriteria,
} from "../searchCriteria/ProgSearch";
import {
  ServiceSearchRaw,
  ServiceSearchCriteria,
} from "../searchCriteria/ServSearch";

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
    cumulativeRecords: number;
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


type WithCriteriaFunction = {
  getSearchCriteria: (data: PipelineData) => SearchCriteria;
};
type WithExplicitCriteria = {
  searchCriteria: SearchCriteria;
};

export type StepConfig = (WithCriteriaFunction | WithExplicitCriteria) & {
  stepName: "customers" | "programs" | "services";
  filterFn?: (
    fetchedData: PipelineData,
    previousData: PipelineData,
  ) => PipelineData;
};

export type SearchScheme = {
  schemeName: string;
  steps: SearchStep[];
};
