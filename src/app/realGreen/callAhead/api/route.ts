import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { normalizeError } from "@/lib/errors/errorHandler";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { CallAheadContract } from "@/app/realGreen/callAhead/_lib/CallAheadContract";
import {
  CallAhead,
  extendCallAheads,
  MongoCallAhead,
  RawCallAhead,
  remapCallAhead,
} from "@/app/realGreen/callAhead/_lib/CallAhead";
import CallAheadModel from "@/app/realGreen/callAhead/_lib/CallAheadModel";

const handlers: HandlerMap<CallAheadContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawCallAheads = await rgApi<RawCallAhead[]>({
        path: "/CallAhead",
        method: "GET",
      });

      const remappedCallAheads = rawCallAheads.map(remapCallAhead);
      await connectToMongoDB();
      const mongoCallAheads: MongoCallAhead[] = await CallAheadModel.find(
        {},
      ).lean();

      const callAheads: CallAhead[] = extendCallAheads({
        remapped: remappedCallAheads,
        mongo: mongoCallAheads,
      });

      return { success: true, payload: callAheads };
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<CallAheadContract>;
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
