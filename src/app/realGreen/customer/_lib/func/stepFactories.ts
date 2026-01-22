import {
  RawData,
  RemappedData,
  MongoData,
  SearchStep,
  SearchType,
  StepContext,
  StepResult,
} from "../cpsSearchTypes/SearchScheme";
import { rgApi, RgApiPath } from "@/app/realGreen/employee/api/rgApi";
import { SearchOptimizer } from "@/app/realGreen/customer/_lib/cpsSearchTypes/SearchOptimizer";
import { realGreenConst } from "@/app/realGreen/_lib/realGreenConst";
import { AppError } from "@/lib/errors/AppError";

// Helper to fetch remaining records
async function* fetchOverflow<TRawData>(
  apiPath: Pick<RgApiPath, "path">,
  baseSearchCriteria: SearchType,
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

    console.log(apiPath.path);
    const res = await rgApi<TRawData>({
      path: apiPath.path as any,
      method: "POST",
      body: body as any,
    });

    const duration = Date.now() - start;

    const items = (res as any)?.items || (Array.isArray(res) ? res : []);

    if (!items || items.length === 0) break;

    yield { items: items as TRawData, duration }; // Yield duration too

    if (items.length < realGreenConst.CustProgServRecordsMax) break;

    currentOffset += realGreenConst.CustProgServRecordsMax;
  }
}

type StepConfig = {
  stepName: "customers" | "programs" | "services";
  getSearchCriteria: ((data: MongoData) => SearchType) | SearchType;
  rgApiPath: Pick<RgApiPath, "path">;
  remapFn: (data: RawData) => RemappedData;
  mongoFn: (data: RemappedData) => Promise<MongoData>;
};

export function createPaginationStep<TRawData extends RawData>(
  config: StepConfig,
): SearchStep {
  return {
    name: config.stepName,
    strategyType: "pagination",
    run: async function* ({ optimizer, prevData }: StepContext) {
      const PAGE_SIZE = realGreenConst.CustProgServRecordsMax;

      // Use defaultPageCount to determine initial records if optimizer is empty
      const lastTotal =
        optimizer.totalRecords ?? realGreenConst.defaultPageCount * PAGE_SIZE;

      const estimatedPages = Math.ceil(lastTotal / PAGE_SIZE);

      let searchCriteria: SearchType;
      if (typeof config.getSearchCriteria === "function") {
        if (!prevData) {
          throw new AppError({
            message:
              `Previous data is null for ${config.stepName}. ` +
              "If this was the first step, do not use the function type for" +
              "getSearchCriteria. If this does not make sense, notify the developer.",
          });
        }
        if (!prevData.length) {
          throw new AppError({
            message:
              `Previous data is empty for ${config.stepName}. ` +
              "Aborting search scheme. Check the searchScheme. If this does not" +
              "make sense, notify the developer.",
          });
        }
        searchCriteria = config.getSearchCriteria(prevData);
      } else {
        searchCriteria = config.getSearchCriteria;
      }

      const promises = Array.from({ length: estimatedPages }).map(
        async (_, i) => {
          const start = Date.now();

          const body = {
            ...searchCriteria,
            records: PAGE_SIZE,
            offset: i * PAGE_SIZE,
          };

          console.log(config.rgApiPath.path);
          const rawData: TRawData = await rgApi<TRawData>({
            path: config.rgApiPath as any,
            method: "POST",
            body: body as any,
          });

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

        const remapData = config.remapFn(res.data);
        const mongoData = await config.mongoFn(remapData);

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
        } of fetchOverflow<TRawData>(
          // config.rgApiPath,
          {
            path: config.rgApiPath.path,
            method: "POST",
            body: searchCriteria,
          } as any,
          searchCriteria,
          nextOffset,
        )) {
          totalRecords += rawItems.length;
          const remapData = config.remapFn(rawItems);
          const mongoData = await config.mongoFn(remapData);

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
  rgApiPath: Pick<RgApiPath, "path">;
  getIds: (prevData: MongoData) => number[];
  getSearchCriteria: (ids: number[]) => SearchType;
  remapFn: (data: TRawData) => RemappedData;
  mongoFn: (data: RemappedData) => Promise<MongoData>;
};

export function createBatchSizeStep<TRawData extends RawData>(
  config: BatchStepConfig<TRawData>,
): SearchStep {
  return {
    name: config.stepName,
    strategyType: "batchSize",
    run: async function* ({ optimizer, prevData }: StepContext) {
      const TARGET_RESPONSE_RATIO = 0.9;
      const TARGET_RECORDS =
        realGreenConst.CustProgServRecordsMax * TARGET_RESPONSE_RATIO;

      let batchSize = realGreenConst.defaultBatchSize;
      if (isBatchOptimizer(optimizer)) {
        batchSize =
          optimizer.optimalBatchSize ?? realGreenConst.defaultBatchSize;
      }

      const allIds = config.getIds(prevData as MongoData);
      const totalIds = allIds.length;

      let currentMaxRecords = 0;

      for (let i = 0; i < totalIds; i += batchSize) {
        const batchIds = allIds.slice(i, i + batchSize);
        const searchCriteria = config.getSearchCriteria(batchIds);

        const start = Date.now();

        const body = { ...searchCriteria };

        console.log(config.rgApiPath.path);
        const res = await rgApi<TRawData>({
          path: config.rgApiPath as any,
          method: "POST",
          body: body as any,
        });

        const items = (res as any)?.items || (Array.isArray(res) ? res : []);
        const rawData = items as TRawData;

        if (rawData.length > currentMaxRecords) {
          currentMaxRecords = rawData.length;
        }

        const remapped = config.remapFn(rawData);
        const mongo = await config.mongoFn(remapped);

        yield {
          data: mongo,
          metrics: { calls: 1, durationMs: Date.now() - start },
        };

        // Check for overflow
        if (rawData.length === realGreenConst.CustProgServRecordsMax) {
          for await (const {
            items: rawItems,
            duration,
          } of fetchOverflow<TRawData>(
            config.rgApiPath as any,
            searchCriteria,
            realGreenConst.CustProgServRecordsMax,
          )) {
            const remappedOverflow = config.remapFn(rawItems as TRawData);
            const mongoOverflow = await config.mongoFn(remappedOverflow);

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
