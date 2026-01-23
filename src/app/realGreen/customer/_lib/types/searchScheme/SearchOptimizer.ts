import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type PaginationStrategy = {
  type: "pagination";
  initialPageCount: number;
};

export type BatchSizeStrategy = {
  type: "batchSize";
  batchSize: number;
  lastMaxResponseSize: number;
};

export type OptimizationStrategy = PaginationStrategy | BatchSizeStrategy;

// any changes to this must be reflected in SearchOptimizerModel.ts
export type SearchOptimizer = CreatedUpdated & OptimizationStrategy & {
  scheme: string;
  step: string;
}
