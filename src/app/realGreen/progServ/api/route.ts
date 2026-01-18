import {NextRequest, NextResponse} from "next/server";
import {HandlerMap, OpMap} from "@/lib/api/types/rpcUtils";
import {normalizeError} from "@/lib/errors/errorHandler";
import {assertRole} from "@/app/auth/_lib/assertRole";
import {ProgServContract} from "@/app/realGreen/progServ/ProgServContract";
import {ProgServ} from "@/app/realGreen/progServ/ProgServ";
import {rgApi} from "@/app/realGreen/employee/api/rgApi";

/**
 * 1. DEFINE HANDLERS
 * Enforces strict typing: You MUST define 'roles' and 'handler'
 * for every operation in ProgServContract.
 */
const handlers: HandlerMap<ProgServContract> = {
  getOne: {
    roles: ["office", "admin", "tech"],
    handler: async (params) => {
      const {progDefId} = params;
      const progServ = await rgApi<ProgServ>({
        path: `/ProgramCode/${progDefId}/Services`,
        method: "GET",
      });
      return ({
        success: true,
        item: progServ
      })
    }
  }
};

/**
 * 2. THE GATEWAY (Generic POST)
 * Handles Deserialization, Validation, Auth, and Error Normalization.
 */
export async function POST(req: NextRequest) {
  try {
    // A. Parse Body & Validate Op
    const body = (await req.json()) as OpMap<ProgServContract>;
    const {op, ...params} = body;
    const config = handlers[op];

    if (!config) {
      return NextResponse.json(
        {success: false, message: `Operation '${op}' not supported`},
        {status: 400},
      );
    }

    // B. Security Check
    await assertRole(config.roles);

    // C. Execution
    const result = await config.handler(params as any);
    return NextResponse.json(result);
  } catch (e) {
    // D. "TWO-HOP" ERROR HANDLING
    const error = normalizeError(e);

    // 1. Log the REAL error (with stack trace) for the developer
    console.error(`[API] ${error.type}: ${error.message}`, {
      stack: error.stack,
      data: error.data,
    });

    // 2. Determine Response Status
    let status = 500;
    if (error.type === "EXTERNAL_ERROR") status = 502;
    else if (error.type === "VALIDATION_ERROR") status = 400;
    else if (error.type === "AUTH_ERROR") status = 403;

    // 3. Return Safe Response
    return NextResponse.json(
      {
        success: false,
        message: error.isOperational ? error.message : "Internal Server Error",
      },
      {status},
    );
  }
}