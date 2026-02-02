import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { normalizeError } from "@/lib/errors/errorHandler";
import { ConditionContract } from "./ConditionContract";
import { rgApi } from "../../_lib/api/rgApi";
import { ConditionRaw } from "@/app/realGreen/conditionCode/_types/ConditionCode";
import { extendConditions, remapConditions } from "../_lib/serverConditionFunc";
import {assertRole} from "@/app/auth/_lib/assertRole";
import * as console from "node:console";

const handlers: HandlerMap<ConditionContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      const rawConditions = await rgApi<ConditionRaw[]>({
        path: "/ConditionCode",
        method: "GET",
      });

      const conditionCores = remapConditions(rawConditions);
      const conditionDocs = await extendConditions(conditionCores);

      return {
        success: true,
        payload: conditionDocs,
      };
    },
  },
};

/**
 * 2. THE GATEWAY (Generic POST)
 * Handles Deserialization, Validation, Auth, and Error Normalization.
 */
export async function POST(req: NextRequest) {
  try {
    // A. Parse Body & Validate Op
    const body = (await req.json()) as OpMap<ConditionContract>;
    const { op, ...params } = body;
    const config = handlers[op];

    if (!config) {
      return NextResponse.json(
        { success: false, message: `Operation '${op}' not supported` },
        { status: 400 },
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
      { status },
    );
  }
}
