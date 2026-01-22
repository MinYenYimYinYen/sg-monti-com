import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { SearchOptimizerModel } from "../models/SearchOptimizerModel";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { SearchOptimizer } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchOptimizer";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { OptimizationStrategyType } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchScheme";

export async function getSearchOptimizer({
  schemeName,
  stepName,
  optimizationStrategy,
}: {
  schemeName: string;
  stepName: string;
  optimizationStrategy: OptimizationStrategyType;
}): Promise<SearchOptimizer> {
  await connectToMongoDB();

  let optimizer = await SearchOptimizerModel.findOne({
    scheme: schemeName,
    step: stepName,
  }).lean();

  if (!optimizer) {
    // Define base defaults
    const baseDefaults = {
      scheme: schemeName,
      step: stepName,
      type: optimizationStrategy,
      totalCalls: 0,
      totalRecords: 0,
      avgDuration: 0,
    };

    // Define strategy-specific defaults
    let strategyDefaults = {};
    if (optimizationStrategy === "pagination") {
      strategyDefaults = {
        lastRecordCount: 0,
      };
    } else if (optimizationStrategy === "batchSize") {
      strategyDefaults = {
        optimalBatchSize: realGreenConst.defaultBatchSize,
        currentMaxRecordCount: 0,
      };
    }

    // Create and save
    const newDoc = await SearchOptimizerModel.create({
      ...baseDefaults,
      ...strategyDefaults,
    });

    // Convert to plain object for cleaning
    optimizer = newDoc.toObject();
  }

  return cleanMongoObject(optimizer) as SearchOptimizer;
}
