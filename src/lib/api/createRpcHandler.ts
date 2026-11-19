import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { normalizeError } from "@/lib/errors/errorHandler";
import { requiredFromData } from "@/lib/errors/accessDenied";
import { assertCapability } from "@/app/auth/_lib/assertCapability";
import type { CapabilityRequirement } from "@/permission/PermissionTypes";
import { ApiContract } from "@/lib/api/types/ApiContract";

/**
 * Universal RPC Handler Factory
 * Standardizes logging, error handling, and auth for all API routes.
 */
export function createRpcHandler<T extends ApiContract>(
  handlers: HandlerMap<T>,
) {
  return async function POST(req: NextRequest) {
    let opName = "unknown";

    try {
      // 1. Parse Body
      const body = (await req.json()) as OpMap<T>;
      const { op, ...params } = body;
      opName = String(op);

      // 2. Validate Op
      const config = handlers[op];
      if (!config) {
        return NextResponse.json(
          {
            success: false,
            message: `Operation '${opName}' not supported`,
            op: opName,
          },
          { status: 400 },
        );
      }

      // 3. Security Check
      // The type requires a capability, but a handler map built with a cast could omit it, and
      // assertCapability(undefined) must never pass. Missing fails closed.
      const { capability } = config as { capability?: CapabilityRequirement };
      if (capability === undefined) {
        return NextResponse.json(
          {
            success: false,
            message: `Operation '${opName}' has no permission gate`,
            op: opName,
          },
          { status: 403 },
        );
      }
      await assertCapability(capability);

      // 4. Execution
      const result = await config.handler(params as any);

      // 5. Success Response
      // If the handler returns a ReadableStream (for streaming), return it directly
      if (result instanceof ReadableStream) {
        return new NextResponse(result);
      }

      // Otherwise return JSON
      return NextResponse.json(result);
    } catch (e) {
      // 6. Error Handling
      const error = normalizeError(e);

      // Log based on severity (unless silent)
      if (!error.silent) {
        if (error.isOperational) {
          console.warn(
            `[API] Op: ${opName} - ${error.type}: ${error.message}`,
            {
              data: error.data,
            },
          );
        } else {
          console.error(
            `[API] Op: ${opName} - ${error.type}: ${error.message}`,
            {
              stack: error.stack,
              data: error.data,
            },
          );
        }
      }

      // Return 200 for Operational Errors (Client handles them as data)
      if (error.isOperational) {
        // Exception: Auth Errors should remain 401/403 for middleware/client handling
        const status = error.type === "AUTH_ERROR" ? error.statusCode : 200;

        // Only a 403 names what was missing. A 401 must never carry it.
        const required =
          error.type === "AUTH_ERROR" && error.statusCode === 403 ? requiredFromData(error.data) : null;

        return NextResponse.json(
          {
            success: false,
            message: error.message,
            silent: error.silent,
            code: error.statusCode,
            op: opName,
            ...(required ? { required } : {}),
          },
          { status },
        );
      }

      // Return 500 for Unexpected Crashes
      return NextResponse.json(
        {
          success: false,
          message: "Internal Server Error",
          op: opName,
        },
        { status: 500 },
      );
    }
  };
}
