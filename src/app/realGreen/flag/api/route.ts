import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { FlagContract } from "@/app/realGreen/flag/api/FlagContract";
import { Flag, RawFlag, remapFlag } from "@/app/realGreen/flag/Flag";

const handlers: HandlerMap<FlagContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawFlags = await rgApi<RawFlag[]>({
        path: "/Flag",
        method: "GET",
      });

      const flags = rawFlags.map(remapFlag);

      return { success: true, items: flags };
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<FlagContract>;
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
  } catch (e) { //todo: this is duplicated in every api route.  A function should be extracted.
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
