import { NextRequest, NextResponse } from "next/server";
import { EmployeeContract } from "@/app/realGreen/employee/api/EmployeeContract";
import { normalizeError } from "@/lib/errors/errorHandler"; // Reuse your normalizer!

// Mocking your Auth/DB checks for this example
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { Employee, EmployeeRaw } from "@/app/realGreen/employee/EmployeeTypes";
import EmployeeModel from "@/app/realGreen/employee/EmployeeModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import {
  extendEmployees,
  remapEmployees,
} from "@/app/realGreen/employee/_lib/employeeServerFunc";

/**
 * 1. DEFINE HANDLERS
 * This enforces strict typing: You MUST define 'roles' and 'handler'
 * for every operation in EmployeeContract.
 */
const handlers: HandlerMap<EmployeeContract> = {
  getAll: {
    roles: ["office", "admin"], // 🔒 Secured
    handler: async (_params) => {
      // "Two-Hop" Source: Calling RealGreen
      // If rgApi throws an error, it bubbles up to the POST catch block
      const rawEmployees = await rgApi<EmployeeRaw[]>({
        path: "/Employee",
        method: "GET",
      });

      const employeeCores = remapEmployees(rawEmployees);
      const employeeDocs = await extendEmployees(employeeCores);

      return { success: true, payload: employeeDocs };
    },
  },
};

/**
 * 2. THE GATEWAY (Generic POST)
 * This logic is identical for nearly every route file.
 * It handles Deserialization, Validation, Auth, and Error Normalization.
 */
export async function POST(req: NextRequest) {
  try {
    // A. Parse Body & Validate Op
    const body = (await req.json()) as OpMap<EmployeeContract>;
    const { op, ...params } = body;
    const config = handlers[op];

    if (!config) {
      return NextResponse.json(
        { success: false, message: `Operation '${op}' not supported` },
        { status: 400 },
      );
    }

    // B. Security Check
    // (Assumes assertRole throws an AUTH_ERROR if failed)
    await assertRole(config.roles);

    // C. Execution
    const result = await config.handler(params as any);
    return NextResponse.json(result);
  } catch (e) {
    // D. "TWO-HOP" ERROR HANDLING
    // We catch upstream errors here, Log them, and return a Status Code.

    const error = normalizeError(e);

    // 1. Log the REAL error (with stack trace) for the developer
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
