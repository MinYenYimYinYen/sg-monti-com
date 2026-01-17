import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { PriceTableContract } from "@/app/realGreen/priceTable/api/PriceTableContract";
import {
  PriceTable,
  RawPriceTable,
  remapPriceTable,
} from "@/app/realGreen/priceTable/PriceTable";

const handlers: HandlerMap<PriceTableContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawPriceTables = await rgApi<RawPriceTable[]>({
        path: "/PriceTable",
        method: "GET",
      });

      const priceTables = rawPriceTables.map(remapPriceTable);

      return { success: true, items: priceTables };
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
