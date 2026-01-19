import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { normalizeError } from "@/lib/errors/errorHandler";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { ProgServMetaContract } from "@/app/realGreen/progServMeta/_lib/types/ProgServMetaContract";
import { ProgServModel } from "@/app/realGreen/progServMeta/_lib/models/ProgServModel";
import { dateCompare } from "@/lib/primatives/dates/dateCompare";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import { ProgServ } from "@/app/realGreen/progServMeta/_lib/types/ProgServ";
import { delay } from "@/lib/async/delay";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import {
  ProgCodeMongo,
  ProgCodeRaw,
  ProgCodeRemapped,
  ProgCodeWithMongo,
  remapProgCodes,
} from "@/app/realGreen/progServMeta/_lib/types/ProgCode";
import {
  extendServCodes,
  ServCodeMongo,
  ServCodeRaw,
  remapServCode,
  ServCode,
} from "@/app/realGreen/progServMeta/_lib/types/ServCode";
import ServCodeModel from "@/app/realGreen/servCode/ServCodeModel";
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

const handlers: HandlerMap<ProgServMetaContract> = {
  syncProgServ: {
    roles: ["office", "admin", "tech"],
    handler: async ({ progDefIds }) => {
      await connectToMongoDB();

      // 1. Check Cache Freshness
      const lastUpdated = await ProgServModel.findOne().sort({ updatedAt: -1 });
      const isFresh =
        lastUpdated &&
        dateCompare.isWithinDays({
          dateLo: lastUpdated.updatedAt.toISOString(),
          dateHi: new Date().toISOString(),
          maxDiff: 0.5, // 12 hours approx (0.5 days)
          options: {
            valueUndefinedReturn: false,
            comparedToUndefinedReturn: false,
          },
        });

      if (isFresh) {
        const items = await ProgServModel.find({}); //todo: fix the model

        return { success: true, items };
      }

      // 2. Fetch from RealGreen (Throttled)
      const allProgServs: ProgServ[] = [];
      for (const id of progDefIds) {
        try {
          const result = await rgApi<ProgServ[]>({
            path: `/ProgramCode/${id}/Services`,
            method: "GET",
          });
          if (Array.isArray(result)) {
            allProgServs.push(...result);
          }
          await delay(10); // Throttle
        } catch (e) {
          console.warn(`Failed to fetch services for ProgDefId ${id}`, e);
        }
      }

      // 3. Upsert to Mongo
      if (allProgServs.length > 0) {
        const bulkOps = allProgServs.map((doc) => ({
          updateOne: {
            filter: { progServId: doc.progServId },
            update: { $set: doc },
            upsert: true,
          },
        }));
        await ProgServModel.bulkWrite(bulkOps);
      }

      // 4. Return fresh list
      const items = await ProgServModel.find({});
      return { success: true, items };
    },
  },
  getProgCodes: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawProgCodes = await rgApi<ProgCodeRaw[]>({
        path: "/ProgramCode",
        method: "GET",
      });
      const remapped = remapProgCodes(rawProgCodes);

      // Filter for available only, just in case the API returns all
      const availableProgCodes = remapped.filter((p) => p.available);
      const progCodes = availableProgCodes.sort((a, b) =>
        a.progCodeId.localeCompare(b.progCodeId),
      );

      const MOCKED_MONGO = progCodes as ProgCodeWithMongo[]; // Mongo db isn't extending this yet.

      return { success: true, items: MOCKED_MONGO };
    },
  },
  getServCodes: {
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
    const body = (await req.json()) as OpMap<ProgServMetaContract>;
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
