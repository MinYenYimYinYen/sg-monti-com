import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { ServCodeContract } from "@/app/realGreen/servCode/api/ServCodeContract";
import {
  extendServCodes,
  MongoServCode,
  RawServCode,
  remapServCode,
  ServCode,
} from "@/app/realGreen/servCode/ServCode";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import ServCodeModel from "@/app/realGreen/servCode/ServCodeModel";

const handlers: HandlerMap<ServCodeContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawServCodes = await rgApi<RawServCode[]>({
        path: "/ServiceCode",
        method: "GET",
      });

      const remappedServCodes = rawServCodes.map(remapServCode);
      await connectToMongoDB();
      const mongoServCodes: MongoServCode[] = await ServCodeModel.find(
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
