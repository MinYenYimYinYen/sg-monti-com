import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { SearchOptimizerModel } from "../models/SearchOptimizerModel";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { SearchOptimizer } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchOptimizer";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";

export async function getSearchOptimizer({
  schemeName,
  stepName,
  type,
}: {
  schemeName: string;
  stepName: string;
  type: "pagination" | "batchSize";
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
      type,
      totalCalls: 0,
      totalRecords: 0,
      avgDuration: 0,
    };

    // Define strategy-specific defaults
    let strategyDefaults = {};
    if (type === "pagination") {
      strategyDefaults = {
        lastRecordCount: 0,
      };
    } else if (type === "batchSize") {
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


