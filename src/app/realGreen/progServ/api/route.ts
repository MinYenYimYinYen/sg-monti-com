import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { normalizeError } from "@/lib/errors/errorHandler";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { ProgServContract } from "@/app/realGreen/progServ/api/ProgServContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { ProgCodeRaw } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCodeRaw } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

import {
  extendProgCodes,
  remapProgCodes,
} from "@/app/realGreen/progServ/_lib/func/progCodeServerFunc";
import {
  extendServCodes,
  remapServCode,
} from "@/app/realGreen/progServ/_lib/func/servCodeServerFunc";
import { syncProgServ } from "@/app/realGreen/progServ/api/syncProgServ";

const handlers: HandlerMap<ProgServContract> = {
  getProgCodes: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawProgCodes = await rgApi<ProgCodeRaw[]>({
        path: "/ProgramCode",
        method: "GET",
      });
      const remapped = remapProgCodes(rawProgCodes);

      // Filter for available only, just in case the API returns all
      const availableProgCodes = remapped.filter((p) => p.available);
      const progCodeCores = availableProgCodes.sort((a, b) =>
        a.progCodeId.localeCompare(b.progCodeId),
      );

      const progCodeDocs = await extendProgCodes(progCodeCores);
      const progServs = await syncProgServ(
        progCodeDocs.map((p) => p.progDefId),
      );

      return { success: true, payload: {progCodeDocs, progServs} };
    },
  },
  getServCodes: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawServCodes = await rgApi<ServCodeRaw[]>({
        path: "/ServiceCode",
        method: "GET",
      });

      const servCodeCores = rawServCodes.map(remapServCode);
      const servCodeDocs = await extendServCodes(servCodeCores);

      return { success: true, payload: servCodeDocs };
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<ProgServContract>;
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

    // --- REFACTOR: Return 200 for Operational Errors ---
    if (error.isOperational) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          silent: error.silent,
          code: error.statusCode,
        },
        { status: 200 }, // 200 OK for handled errors
      );
    }

    // Keep 500 for unexpected crashes
    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
