import { SearchOptimizer } from "./SearchOptimizer";
import {
  CustomerRaw,
  CustomerRemapped,
  CustomerWithMongo,
} from "@/app/realGreen/customer/_lib/types/Customer";
import {
  ProgramRaw,
  ProgramRemapped,
  ProgramWithMongo,
} from "@/app/realGreen/customer/_lib/types/Program";
import {
  ServiceRaw,
  ServiceRemapped,
  ServiceWithMongo,
} from "@/app/realGreen/customer/_lib/types/Service";
import {CustomerSearchRG} from "@/app/realGreen/customer/_lib/searchTypes/CustSearch";
import { ProgramSearchRG } from "../searchTypes/ProgSearch";
import { ServiceSearchRG } from "../searchTypes/ServSearch";

export type RawData = CustomerRaw[] | ProgramRaw[] | ServiceRaw[];

export type RemappedData = 
  | CustomerRemapped[]
  | ProgramRemapped[]
  | ServiceRemapped[]

export type MongoData =
  | CustomerWithMongo[]
  | ProgramWithMongo[]
  | ServiceWithMongo[];

export type SearchType = 
  | CustomerSearchRG
  | ProgramSearchRG
  | ServiceSearchRG

export type StepContext = {
  prevData: MongoData | null; // Data from the previous step
  optimizer: SearchOptimizer; // Optimization stats for this step
};

export type StepResult = {
  data: MongoData;
  metrics: {
    calls: number;
    durationMs: number;
  };
  // The step calculates its own optimization updates
  optimizationUpdate?: Partial<SearchOptimizer>;
};

export type SearchStep = {
  name: "customers" | "programs" | "services";
  // Enforce strategy at definition time to match the optimizer
  strategyType: "pagination" | "batchSize";
  run: (ctx: StepContext) => AsyncGenerator<StepResult>;
};

export type SearchScheme = {
  name: string;
  steps: SearchStep[];
};
