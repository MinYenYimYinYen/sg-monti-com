import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { ServCodeContract } from "@/app/realGreen/servCode/api/ServCodeContract";
import {
  extendServCodes,
  ServCodeMongo,
  ServCodeRaw,
  remapServCode,
  ServCode,
} from "@/app/realGreen/progServMeta/_lib/types/ServCode";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import ServCodeModel from "@/app/realGreen/servCode/ServCodeModel";

const handlers: HandlerMap<ServCodeContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawServCodes = await rgApi<ServCodeRaw[]>({
        path: "/ServiceCode",
        method: "GET",
      });

      const remappedServCodes = rawServCodes.map(remapServCode);
      await connectToMongoDB();
      const mongoServCodes: ServCodeMongo[] = await ServCodeModel.find(
        {},
      ).lean();

      const servCodes: ServCode[] = extendServCodes({
        remapped: remappedServCodes,
        mongo: mongoServCodes,
      });

      return { success: true, items: servCodes };
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<ServCodeContract>;
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
