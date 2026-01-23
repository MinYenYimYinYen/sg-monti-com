import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { SearchOptimizerModel } from "../models/SearchOptimizerModel";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { SearchOptimizer } from "@/app/realGreen/customer/_lib/types/searchScheme/SearchOptimizer";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { OptimizationStrategyType } from "@/app/realGreen/customer/_lib/types/searchScheme/SearchScheme";

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
      usageHistory: [],
    };

    // Define strategy-specific defaults
    let strategyDefaults = {};
    if (optimizationStrategy === "pagination") {
      strategyDefaults = {
        initialPageCount: realGreenConst.defaultPageCount,
      };
    } else if (optimizationStrategy === "batchSize") {
      strategyDefaults = {
        batchSize: realGreenConst.defaultBatchSize,
        lastMaxResponseSize: 0
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
