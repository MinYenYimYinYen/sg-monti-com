import {
  RawData,
  PipelineDataCore,
  PipelineData,
  SearchStep,
  SearchCriteria,
  SearchCriteriaRaw,
  StepContext,
  StepResult,
} from "../cpsSearchTypes/SearchScheme";
import { SearchOptimizer } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchOptimizer";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";
import { rgSearch } from "@/app/realGreen/employee/api/rgSearchApi";
import { remapCustSearch } from "@/app/realGreen/customer/_lib/searchTypes/CustSearch";
import { remapProgSearch } from "@/app/realGreen/customer/_lib/searchTypes/ProgSearch";
import { remapServSearch } from "@/app/realGreen/customer/_lib/searchTypes/ServSearch";
import {
  CustomerCore,
  CustomerRaw,
  extendCustomers,
  remapCustomers,
} from "@/app/realGreen/customer/_lib/types/Customer";
import {
  extendPrograms,
  ProgramCore,
  ProgramRaw,
  remapPrograms,
} from "@/app/realGreen/customer/_lib/types/Program";
import {
  extendServices,
  remapServices,
  ServiceCore,
  ServiceRaw,
} from "@/app/realGreen/customer/_lib/types/Service";

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
async function* fetchOverflow<TRawData>(
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

    const res = await rgSearch<TRawData>(body);

    const duration = Date.now() - start;

    const items = (res as any)?.items || (Array.isArray(res) ? res : []);

    if (!items || items.length === 0) break;

    yield { items: items as TRawData, duration }; // Yield duration too

    if (items.length < realGreenConst.CustProgServRecordsMax) break;

    currentOffset += realGreenConst.CustProgServRecordsMax;
  }
}

type WithCriteriaFunction = {
  getSearchCriteria: (data: PipelineData) => SearchCriteria;
};
type WithExplicitCriteria = {
  searchCriteria: SearchCriteria;
};

type StepConfig = (WithCriteriaFunction | WithExplicitCriteria) & {
  stepName: "customers" | "programs" | "services";
  filterFn?: (
    fetchedData: PipelineData,
    previousData: PipelineData,
  ) => PipelineData;
};

export function createPaginationStep<TRawData extends RawData>(
  config: StepConfig,
): SearchStep {
  const remapFn = getRemapFn(config.stepName);
  const mongoFn = getMongoFn(config.stepName);

  return {
    stepName: config.stepName,
    optimizationStrategy: "pagination",
    run: async function* ({ optimizer, pipelineData }: StepContext) {
      const PAGE_SIZE = realGreenConst.CustProgServRecordsMax;

      // Use defaultPageCount to determine initial records if optimizer is empty
      const lastTotal =
        optimizer.totalRecords ?? realGreenConst.defaultPageCount * PAGE_SIZE;

      const estimatedPages = Math.ceil(lastTotal / PAGE_SIZE);

      let searchCriteria: SearchCriteria;

      if ("getSearchCriteria" in config) {
        if (!pipelineData) {
          throw new AppError({
            message:
              `Previous data is null for ${config.stepName}. ` +
              "If this was the first step, do not use the function type for" +
              "getSearchCriteria. If this does not make sense, notify the developer.",
          });
        }
        if (!pipelineData.length) {
          throw new AppError({
            message:
              `Previous data is empty for ${config.stepName}. ` +
              "Aborting search scheme. Check the searchScheme. If this does not" +
              "make sense, notify the developer.",
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

      for (const res of results) {
        totalRecords += res.data.length;

        const remapData = remapFn(res.data);
        let mongoData = await mongoFn(remapData);

        if (config.filterFn) {
          mongoData = config.filterFn(mongoData, pipelineData || []);
        }

        yield {
          data: mongoData,
          metrics: { calls: 1, durationMs: res.duration },
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

          yield {
            data: mongoData,
            metrics: { calls: 1, durationMs: duration },
          } as StepResult;
        }
      }

      yield {
        data: [],
        metrics: { calls: 0, durationMs: 0 },
        optimizationUpdate: {
          lastRecordCount: totalRecords,
        },
      };
    },
  };
}

function isBatchOptimizer(
  opt: SearchOptimizer,
): opt is SearchOptimizer & { type: "batchSize" } {
  return opt.type === "batchSize";
}

type BatchStepConfig<TRawData> = {
  stepName: "customers" | "programs" | "services";
  getIds: (pipelineData: PipelineData) => number[];
  getSearchCriteria: (ids: number[]) => SearchCriteria;
  filterFn?: (
    fetchedData: PipelineData,
    previousData: PipelineData,
  ) => PipelineData;
};

export function createBatchSizeStep<TRawData extends RawData>(
  config: BatchStepConfig<TRawData>,
): SearchStep {
  const remapFn = getRemapFn(config.stepName);
  const mongoFn = getMongoFn(config.stepName);

  return {
    stepName: config.stepName,
    optimizationStrategy: "batchSize",
    run: async function* ({ optimizer, pipelineData }: StepContext) {
      const TARGET_RESPONSE_RATIO = 0.9;
      const TARGET_RECORDS =
        realGreenConst.CustProgServRecordsMax * TARGET_RESPONSE_RATIO;

      let batchSize = realGreenConst.defaultBatchSize;
      if (isBatchOptimizer(optimizer)) {
        batchSize =
          optimizer.optimalBatchSize ?? realGreenConst.defaultBatchSize;
      }

      const allIds = config.getIds(pipelineData as PipelineData);
      const totalIds = allIds.length;

      let currentMaxRecords = 0;

      for (let i = 0; i < totalIds; i += batchSize) {
        const batchIds = allIds.slice(i, i + batchSize);
        const searchCriteria = config.getSearchCriteria(batchIds);

        // Map to Raw Criteria here
        const rawCriteria = mapCriteria(config.stepName, searchCriteria);

        const start = Date.now();

        const body = { ...rawCriteria };

        const res = await rgSearch<TRawData>(body);

        const items = (res as any)?.items || (Array.isArray(res) ? res : []);
        const rawData = items as TRawData;

        if (rawData.length > currentMaxRecords) {
          currentMaxRecords = rawData.length;
        }

        const remapped = remapFn(rawData);
        let mongoData = await mongoFn(remapped);

        if (config.filterFn) {
          mongoData = config.filterFn(mongoData, pipelineData || []);
        }

        yield {
          data: mongoData,
          metrics: { calls: 1, durationMs: Date.now() - start },
        };

        // Check for overflow
        if (rawData.length === realGreenConst.CustProgServRecordsMax) {
          for await (const {
            items: rawItems,
            duration,
          } of fetchOverflow<TRawData>(
            rawCriteria,
            realGreenConst.CustProgServRecordsMax,
          )) {
            const remappedOverflow = remapFn(rawItems as TRawData);
            let mongoOverflow = await mongoFn(remappedOverflow);

            if (config.filterFn) {
              mongoOverflow = config.filterFn(mongoOverflow, pipelineData || []);
            }

            yield {
              data: mongoOverflow,
              metrics: { calls: 1, durationMs: duration },
            };
          }
        }
      }

      // Optimization Logic
      let newBatchSize = batchSize;

      if (currentMaxRecords > 0) {
        const ratio = TARGET_RECORDS / currentMaxRecords;
        newBatchSize = Math.floor(batchSize * ratio);
      } else {
        newBatchSize = batchSize * 2;
      }

      newBatchSize = Math.max(1, Math.min(newBatchSize, 1000));

      yield {
        data: [],
        metrics: { calls: 0, durationMs: 0 },
        optimizationUpdate: {
          optimalBatchSize: newBatchSize,
          currentMaxRecordCount: currentMaxRecords,
        },
      };
    },
  };
}
