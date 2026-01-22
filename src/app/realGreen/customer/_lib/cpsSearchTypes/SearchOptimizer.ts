import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

export type OptimizationStrategy =
  | { type: "pagination", lastRecordCount: number }
  | { type: "batchSize", optimalBatchSize: number, currentMaxRecordCount: number }

// any changes to this must be reflected in SearchOptimizerModel.ts
export type SearchOptimizer = CreatedUpdated & OptimizationStrategy & {
  scheme: string;
  step: string;

  totalCalls: number;
  totalRecords: number;
  avgDuration: number;
}

