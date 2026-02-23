import {
  RawData,
  PipelineDataCore,
  PipelineData,
  SearchStep,
  SearchCriteria,
  SearchCriteriaRaw,
  StepContext,
  StepResult, StepConfig,
} from "../types/SearchScheme";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";
import { rgSearch } from "@/app/realGreen/_lib/api/rgSearchApi";
import {
  CustomerCore,
  CustomerRaw,
} from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import {
  extendCustomers,
  remapCustomers,
} from "@/app/realGreen/customer/_lib/entities/serverFuncs/CustomerFuncs";
import {
  ProgramCore,
  ProgramRaw,
} from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import {
  extendPrograms,
  remapPrograms,
} from "@/app/realGreen/customer/_lib/entities/serverFuncs/ProgramFuncs";
import {
  ServiceCore,
  ServiceRaw,
} from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import {
  extendServices,
  remapServices,
} from "@/app/realGreen/customer/_lib/entities/serverFuncs/serviceServerFunc";
import {
  calculateNextBatchSize,
  calculateNextPagination
} from "@/app/realGreen/customer/_lib/searchUtil/searchSchemes/searchOptimizer/optimizerCalculations";
import {remapCustSearch} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapCustSearch";
import {remapProgSearch} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapProgSearch";
import {remapServSearch} from "@/app/realGreen/customer/_lib/searchUtil/searchCriteria/func/remapServSearch";
import {binarySearchCorruptedRecord} from "./binaryOffsetSearch";
import {binarySearchCorruptedId} from "./binaryIdSearch";

// Helper to map criteria based on step name
function mapCriteria(
  stepName: string,
  criteria: SearchCriteria,
): SearchCriteriaRaw {
  switch (stepName) {
    case "customers":
      return remapCustSearch(criteria as any);
    case "programs":
      return remapProgSearch(criteria as any);
    case "services":
      return remapServSearch(criteria as any);
    default:
      throw new Error(`Unknown step name: ${stepName}`);
  }
}

function getRemapFn(stepName: string): (data: RawData) => PipelineDataCore {
  switch (stepName) {
    case "customers":
      return (data) => remapCustomers(data as CustomerRaw[]);
    case "programs":
      return (data) => remapPrograms(data as ProgramRaw[]);
    case "services":
      return (data) => remapServices(data as ServiceRaw[]);
    default:
      throw new Error(`Unknown step name: ${stepName}`);
  }
}

function getMongoFn(
  stepName: string,
): (data: PipelineDataCore) => Promise<PipelineData> {
  switch (stepName) {
    case "customers":
      return async (data) =>
        (await extendCustomers(data as CustomerCore[])) as PipelineData;
    case "programs":
      return async (data) =>
        (await extendPrograms(data as ProgramCore[])) as PipelineData;
    case "services":
      return async (data) =>
        (await extendServices(data as ServiceCore[])) as PipelineData;
    default:
      throw new Error(`Unknown step name: ${stepName}`);
  }
}

// Helper to fetch remaining records
async function* fetchOverflow<TRawData extends RawData>(
  baseSearchCriteria: SearchCriteriaRaw,
  startOffset: number,
) {
  let currentOffset = startOffset;

  while (true) {
    const start = Date.now(); // Track duration
    const body = {
      ...baseSearchCriteria,
      records: realGreenConst.CustProgServRecordsMax,
      offset: currentOffset,
    };

    try {
      const res = await rgSearch<TRawData>(body);

      const duration = Date.now() - start;

      const items = (res as any)?.items || (Array.isArray(res) ? res : []);

      if (!items || items.length === 0) break;

      yield { items: items as TRawData, duration }; // Yield duration too

      if (items.length < realGreenConst.CustProgServRecordsMax) break;

      currentOffset += realGreenConst.CustProgServRecordsMax;
    } catch (error) {
      // Check if this is the specific corrupted data error
      const isCorruptedDataError =
        error instanceof Error &&
        error.message === "Nullable object must have a value.";

      if (isCorruptedDataError) {
        // Hit corrupted data. Use binary search to isolate and skip only the corrupted record
        console.error(`[stepFactories] fetchOverflow - Corrupted data error at offset ${currentOffset}. Using binary search to isolate corrupted record.`);
        console.error('[stepFactories] fetchOverflow - Error details:', error);

        // Use binary search to recover all valid records, skipping only the corrupted one
        yield* binarySearchCorruptedRecord<TRawData>(
          baseSearchCriteria,
          currentOffset,
          realGreenConst.CustProgServRecordsMax,
        );

        // Move to next batch after recovery
        currentOffset += realGreenConst.CustProgServRecordsMax;
        console.log(`[stepFactories] fetchOverflow - Binary search complete, moving to offset ${currentOffset}`);
      } else {
        // Different error - rethrow
        throw error;
      }
    }
  }
}



export function createPaginationStep<TRawData extends RawData>(
  config: StepConfig,
): SearchStep {
  const remapFn = getRemapFn(config.stepName);
  const mongoFn = getMongoFn(config.stepName);

  return {
    stepName: config.stepName,
    optimizerKey: config.optimizerKey,
    optimizationStrategy: "pagination",
    run: async function* ({ optimizer, pipelineData }: StepContext) {
      const PAGE_SIZE = realGreenConst.CustProgServRecordsMax;

      // Type Guard: Ensure we have the correct optimizer strategy
      if (optimizer.type !== "pagination") {
        throw new AppError({
          message: `Invalid optimizer type for pagination step: ${optimizer.type}`,
          type: "SERVER_ERROR",
          statusCode: 500,

        });
      }

      // Use stored value directly (guaranteed by getOptimizer defaults)
      const estimatedPages = optimizer.initialPageCount;

      let searchCriteria: SearchCriteria;

      if ("getSearchCriteria" in config) {
        if (!pipelineData) {
          throw new AppError({
            message:
              `Previous data is null for ${config.stepName}. ` +
              "If this was the first step, do not use the function type for" +
              "getSearchCriteria. If this does not make sense, notify the developer.",
            type: "SERVER_ERROR",
            statusCode: 500,
            data: { pipelineData },
          });
        }
        if (!pipelineData.length) {
          throw new AppError({
            message:
              `Previous data is empty for ${config.stepName}. ` +
              "Aborting search scheme. Check the searchScheme. If this does not" +
              "make sense, notify the developer.",
            type: "SERVER_ERROR",
            statusCode: 500,
            data: { pipelineData },
          });
        }
        searchCriteria = config.getSearchCriteria(pipelineData);
      } else {
        searchCriteria = config.searchCriteria;
      }


      // Map to Raw Criteria here
      const rawCriteria = mapCriteria(config.stepName, searchCriteria);

      const promises = Array.from({ length: estimatedPages }).map(
        async (_, i) => {
          const start = Date.now();

          const body = {
            ...rawCriteria,
            records: PAGE_SIZE,
            offset: i * PAGE_SIZE,
          };

          const rawData: TRawData = await rgSearch<TRawData>(body);


          const items =
            (rawData as any)?.items || (Array.isArray(rawData) ? rawData : []);

          return {
            data: items as TRawData,
            duration: Date.now() - start,
          };
        },
      );

      const results = await Promise.all(promises);

      let totalRecords = 0;
      let cumulativeRecords = 0;

      for (const res of results) {
        totalRecords += res.data.length;

        const remapData = remapFn(res.data);
        let mongoData = await mongoFn(remapData);

        if (config.filterFn) {
          mongoData = config.filterFn(mongoData, pipelineData || []);
        }

        cumulativeRecords += mongoData.length;

        yield {
          data: mongoData,
          metrics: { calls: 1, durationMs: res.duration, cumulativeRecords },
        } as StepResult;
      }

      // Check for overflow on the last page
      const lastResult = results[results.length - 1];
      if (lastResult && lastResult.data.length === PAGE_SIZE) {
        const nextOffset = estimatedPages * PAGE_SIZE;

        for await (const {
          items: rawItems,
          duration,
        } of fetchOverflow<TRawData>(rawCriteria, nextOffset)) {
          totalRecords += rawItems.length;
          const remapData = remapFn(rawItems);
          let mongoData = await mongoFn(remapData);

          if (config.filterFn) {
            mongoData = config.filterFn(mongoData, pipelineData || []);
          }

          cumulativeRecords += mongoData.length;

          yield {
            data: mongoData,
            metrics: { calls: 1, durationMs: duration, cumulativeRecords },
          } as StepResult;
        }
      }

      // Calculate next optimization values
      const optimizationUpdate = calculateNextPagination(totalRecords);

      yield {
        data: [],
        metrics: { calls: 0, durationMs: 0, cumulativeRecords },
        optimizationUpdate,
      };
    },
  };
}

type BatchStepConfig = {
  stepName: "customers" | "programs" | "services";
  optimizerKey?: string;
  getIds: (pipelineData: PipelineData) => number[];
  getSearchCriteria: (ids: number[]) => SearchCriteria;
  filterFn?: (
    fetchedData: PipelineData,
    previousData: PipelineData,
  ) => PipelineData;
};

export function createBatchSizeStep<TRawData extends RawData>(
  config: BatchStepConfig,
): SearchStep {
  const remapFn = getRemapFn(config.stepName);
  const mongoFn = getMongoFn(config.stepName);

  return {
    stepName: config.stepName,
    optimizerKey: config.optimizerKey,
    optimizationStrategy: "batchSize",
    run: async function* ({ optimizer, pipelineData }: StepContext) {

      // Type Guard: Ensure we have the correct optimizer strategy
      if (optimizer.type !== "batchSize") {
        throw new AppError({
          message: `Invalid optimizer type for batchSize step: ${optimizer.type}`,
          type: "SERVER_ERROR",
          statusCode: 500,
        });
      }

      // Use stored value directly (guaranteed by getOptimizer defaults)
      const batchSize = optimizer.batchSize;

      const allIds = config.getIds(pipelineData as PipelineData);
      const totalIds = allIds.length;

      let currentMaxRecords = 0;
      let cumulativeRecords = 0;

      for (let i = 0; i < totalIds; i += batchSize) {
        const batchIds = allIds.slice(i, i + batchSize);
        const searchCriteria = config.getSearchCriteria(batchIds);

        // Map to Raw Criteria here
        const rawCriteria = mapCriteria(config.stepName, searchCriteria);

        const start = Date.now();

        const body = { ...rawCriteria };

        let rawData: TRawData;
        let batchTotalRecords = 0;

        try {
          const res = await rgSearch<TRawData>(body);

          const items = (res as any)?.items || (Array.isArray(res) ? res : []);
          rawData = items as TRawData;
          batchTotalRecords = rawData.length;

          const remapped = remapFn(rawData);
          let mongoData = await mongoFn(remapped);

          if (config.filterFn) {
            mongoData = config.filterFn(mongoData, pipelineData || []);
          }

          cumulativeRecords += mongoData.length;

          yield {
            data: mongoData,
            metrics: { calls: 1, durationMs: Date.now() - start, cumulativeRecords },
          };
        } catch (error) {
          // Check if this is the specific corrupted data error
          const isCorruptedDataError =
            error instanceof Error &&
            error.message === "Nullable object must have a value.";

          if (isCorruptedDataError) {
            console.error(`[createBatchSizeStep] Corrupted data error in batch with ${batchIds.length} IDs. Using binary search to isolate corrupted ID.`);
            console.error('[createBatchSizeStep] Error details:', error);

            // Use binary search on IDs to isolate and skip only the corrupted ID
            for await (const { items: rawItems, duration } of binarySearchCorruptedId<TRawData>(
              batchIds,
              config.getSearchCriteria,
              (criteria) => mapCriteria(config.stepName, criteria),
            )) {
              batchTotalRecords += rawItems.length;

              const remapped = remapFn(rawItems as TRawData);
              let mongoData = await mongoFn(remapped);

              if (config.filterFn) {
                mongoData = config.filterFn(mongoData, pipelineData || []);
              }

              cumulativeRecords += mongoData.length;

              yield {
                data: mongoData,
                metrics: { calls: 1, durationMs: duration, cumulativeRecords },
              };
            }
          } else {
            // Different error - rethrow
            throw error;
          }
        }

        // For overflow handling, only if we got data without error
        if (batchTotalRecords === 0) continue;

        // Check for overflow (only if rawData was successfully fetched)
        if (rawData! && rawData.length === realGreenConst.CustProgServRecordsMax) {
          for await (const {
            items: rawItems,
            duration,
          } of fetchOverflow<TRawData>(
            rawCriteria,
            realGreenConst.CustProgServRecordsMax,
          )) {
            // Accumulate overflow records
            batchTotalRecords += rawItems.length;

            const remappedOverflow = remapFn(rawItems as TRawData);
            let mongoOverflow = await mongoFn(remappedOverflow);

            if (config.filterFn) {
              mongoOverflow = config.filterFn(mongoOverflow, pipelineData || []);
            }

            cumulativeRecords += mongoOverflow.length;

            yield {
              data: mongoOverflow,
              metrics: { calls: 1, durationMs: duration, cumulativeRecords },
            };
          }
        }

        // Update max records found in a single batch
        if (batchTotalRecords > currentMaxRecords) {
          currentMaxRecords = batchTotalRecords;
        }
      }

      // Calculate next optimization values
      const optimizationUpdate = calculateNextBatchSize(batchSize, currentMaxRecords);

      yield {
        data: [],
        metrics: { calls: 0, durationMs: 0, cumulativeRecords },
        optimizationUpdate,
      };
    },
  };
}
