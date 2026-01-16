import { NextRequest, NextResponse } from "next/server";
import { EmployeeContract } from "@/app/realGreen/employee/api/EmployeeContract";
import { normalizeError } from "@/lib/errors/errorHandler"; // Reuse your normalizer!

// Mocking your Auth/DB checks for this example
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import {
  Employee,
  extendEmployees,
  MongoEmployee,
  RawEmployee,
  remapEmployee,
} from "@/app/realGreen/employee/Employee";
import EmployeeModel from "@/app/realGreen/employee/EmployeeModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

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
      const rawEmployees = await rgApi<RawEmployee[]>({
        path: "/Employee",
        method: "GET",
      });

      const remappedEmployees = rawEmployees.map(remapEmployee);
      await connectToMongoDB();
      const mongoEmployees: MongoEmployee[] = await EmployeeModel.find(
        {},
      ).lean();

      const employees: Employee[] = extendEmployees({
        remapped: remappedEmployees,
        mongo: mongoEmployees,
      });

      return { success: true, items: employees };
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

    // 2. Determine Response Status
    // EXTERNAL_ERROR (RealGreen failed) -> 502 Bad Gateway
    // VALIDATION_ERROR -> 400 Bad Request
    // AUTH_ERROR -> 401/403
    // Everything else -> 500 Internal Server Error
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
