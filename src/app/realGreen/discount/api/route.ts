import {NextRequest, NextResponse} from "next/server";
import {HandlerMap, OpMap} from "@/lib/api/types/rpcUtils";
import {normalizeError} from "@/lib/errors/errorHandler";
import {assertRole} from "@/app/auth/_lib/assertRole";
import {DiscountContract} from "@/app/realGreen/discount/api/DiscountContract";
import {rgApi} from "@/app/realGreen/_lib/api/rgApi";
import {DiscountDoc, DiscountRaw} from "@/app/realGreen/discount/Discount.types";
import {extendDiscounts, remapDiscounts} from "@/app/realGreen/discount/_lib/discountServerFunc";
import {DataResponse} from "@/lib/api/types/responses";


const handlers: HandlerMap<DiscountContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawDiscounts = await rgApi<DiscountRaw[]>({
        path: "/DiscountCode",
        method: "GET",
      })

      const discountCores = remapDiscounts(rawDiscounts);
      const discountDocs = await extendDiscounts(discountCores)

      const response: DataResponse<DiscountDoc[]> = {
        success: true,
        payload: discountDocs
      }

      return response;
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
    const body = (await req.json()) as OpMap<DiscountContract>;
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