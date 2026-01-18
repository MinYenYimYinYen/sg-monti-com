import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { ProgCodeContract } from "@/app/realGreen/progCode/_lib/ProgCodeContract";
import {
  ProgCode,
  RawProgramCode,
  remapProgramCode,
} from "@/app/realGreen/progCode/_lib/ProgCode";

const handlers: HandlerMap<ProgCodeContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawProgCodes = await rgApi<RawProgramCode[]>({
        path: "/ProgramCode",
        method: "GET",
      });

      // Filter for available only, just in case the API returns all
      const availableProgCodes = rawProgCodes.filter((p) => p.available);
      const progCodes = availableProgCodes
        .map(remapProgramCode)
        .sort((a, b) => a.progCodeId.localeCompare(b.progCodeId));

      return { success: true, items: progCodes };
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<ProgCodeContract>;
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
