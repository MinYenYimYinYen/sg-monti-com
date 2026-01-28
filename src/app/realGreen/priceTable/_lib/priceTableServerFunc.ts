import {
  PriceTableCore,
  PriceTableDoc,
  PriceTableRaw,
} from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import {
  PriceRangeCore,
  PriceRangeDoc,
  PriceRangeRaw,
} from "@/app/realGreen/priceTable/_types/PriceRangeType";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { Grouper } from "@/lib/Grouper";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { PriceTableDocModel } from "@/app/realGreen/priceTable/_models/PriceTableDocModel";
import { dateCompare } from "@/lib/primatives/dates/dateCompare";
import { DataResponse, ErrorResponse } from "@/lib/api/types/responses";
import { getBulkOpsResult } from "@/lib/mongoose/getBulkOpsResult";

function remapPriceTable(raw: PriceTableRaw): Omit<PriceTableCore, "ranges"> {
  return {
    tableId: raw.id,
    desc: raw.description,
    maxPrice: raw.maxRate,
    maxSize: raw.maxSize,
  };
}

export function remapPriceTables(
  raw: PriceTableRaw[],
): Omit<PriceTableCore, "ranges">[] {
  return raw.map(remapPriceTable);
}

export async function extendPriceTables(
  priceTables: Omit<PriceTableCore, "ranges">[],
): Promise<Omit<PriceTableDoc, "ranges">[]> {
  return priceTables as Omit<PriceTableDoc, "ranges">[];
}

function remapPriceRange(raw: PriceRangeRaw): PriceRangeCore {
  return {
    tableId: raw.priceTableID,
    priceId: raw.id,
    size: raw.size,
    price: raw.rate,
  };
}

export function remapPriceRanges(raw: PriceRangeRaw[]): PriceRangeCore[] {
  return raw.map(remapPriceRange);
}

export function extendPriceRanges(
  priceRanges: PriceRangeCore[],
): PriceRangeDoc[] {
  return priceRanges as PriceRangeDoc[];
}

export async function fetchRGPriceTableDocs() {
  const priceTablesRaw = await rgApi<PriceTableRaw[]>({
    path: "/PriceTable",
    method: "GET",
  });

  const priceTableCores = remapPriceTables(priceTablesRaw);
  const partialPriceTableDocs = await extendPriceTables(priceTableCores);

  const tableIds = priceTableCores.map((p) => p.tableId);

  const priceRangesRaw: PriceRangeRaw[] = [];
  for (const tableId of tableIds) {
    const priceRange = await rgApi<PriceRangeRaw>({
      path: `/PriceTable/${tableId}/Detailed`,
      method: "GET",
    });
    priceRangesRaw.push(priceRange);
  }
  const priceRangeCores = remapPriceRanges(priceRangesRaw);
  const priceRangeDocs = extendPriceRanges(priceRangeCores);
  const priceRangesByTableId = new Grouper(priceRangeDocs)
    .groupBy((item) => item.tableId)
    .toMap();

  const priceTableDocs: PriceTableDoc[] = partialPriceTableDocs.map((pt) => {
    return {
      ...pt,
      ranges: priceRangesByTableId.get(pt.tableId) || [],
    };
  });
  return priceTableDocs;
}

export async function fetchMongoPriceTableDocs(ageDays: number) {
  await connectToMongoDB();

  // Check Freshness
  const lastUpdated = await PriceTableDocModel.findOne()
    .sort({ updatedAt: -1 })
    .lean();
  const isFresh =
    lastUpdated &&
    dateCompare.isWithinDays({
      dateLo: new Date(lastUpdated.updatedAt).toISOString(),
      dateHi: new Date().toISOString(),
      maxDiff: ageDays,
      options: {
        valueUndefinedReturn: false,
        comparedToUndefinedReturn: false,
      },
    });
  if (!isFresh) return null;
  return PriceTableDocModel.find({});
}

export async function cachePriceTableDocs(priceTableDocs: PriceTableDoc[]) {
  await connectToMongoDB();
  if (priceTableDocs.length > 0) {
    const bulkOps = priceTableDocs.map((pt) => ({
      updateOne: {
        filter: { tableId: pt.tableId },
        update: { $set: pt },
        upsert: true,
      },
    }));
    const result = PriceTableDocModel.bulkWrite(bulkOps, { ordered: false });
    return getBulkOpsResult(result);
  }
  const noDocsResponse: ErrorResponse = {
    success: false,
    message: "No price table docs to cache",
  };
  return noDocsResponse;
}
