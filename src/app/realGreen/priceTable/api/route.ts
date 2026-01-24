import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { PriceTableContract } from "@/app/realGreen/priceTable/api/PriceTableContract";
import {
  PriceTable,
  PriceTableDoc,
  PriceTableRaw,
} from "@/app/realGreen/priceTable/_entities/PriceTableTypes";
import {
  extendPriceRanges,
  extendPriceTables,
  remapPriceRanges,
  remapPriceTables,
} from "@/app/realGreen/priceTable/_lib/priceTableServerFunc";
import { PriceRangeRaw } from "@/app/realGreen/priceTable/_entities/PriceRangeType";
import { Grouper } from "@/lib/Grouper";

const handlers: HandlerMap<PriceTableContract> = {
  getPriceTableDocs: {
    roles: ["office", "admin"],
    handler: async () => {

      //todo: Cache these in mongo.  It's a slow load.
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

      const priceTableDocs: PriceTableDoc[] = partialPriceTableDocs.map(
        (pt) => {
          return {
            ...pt,
            ranges: priceRangesByTableId.get(pt.tableId) || [],
          };
        },
      );

      return { success: true, payload: priceTableDocs };
    },
  },


};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<PriceTableContract>;
    const { op, ...params } = body;
    const config = handlers[op];

    if (!config) {
      return NextResponse.json(
        { success: false, message: `Operation '${op}' not supported` },
        { status: 400 },
      );
    }

    await assertRole(config.roles);

    const result = await config.handler(params as any);
    return NextResponse.json(result);
  } catch (e) {
    const error = normalizeError(e);
    console.error(`[API] ${error.type}: ${error.message}`, {
      stack: error.stack,
      data: error.data,
    });

    let status = 500;
    if (error.type === "EXTERNAL_ERROR") status = 502;
    else if (error.type === "VALIDATION_ERROR") status = 400;
    else if (error.type === "AUTH_ERROR") status = 403;

    return NextResponse.json(
      {
        success: false,
        message: error.isOperational ? error.message : "Internal Server Error",
      },
      { status },
    );
  }
}
