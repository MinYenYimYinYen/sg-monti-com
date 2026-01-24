import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { normalizeError } from "@/lib/errors/errorHandler";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { ProgServContract } from "@/app/realGreen/progServ/api/ProgServContract";
import { ProgServModel } from "@/app/realGreen/progServ/_models/ProgServModel";
import { dateCompare } from "@/lib/primatives/dates/dateCompare";
import { rgApi } from "@/app/realGreen/employee/api/rgApi";
import {
  RawProgServ,
  remapProgServs,
} from "@/app/realGreen/progServ/_lib/types/ProgServ";
import { delay } from "@/lib/async/delay";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { ProgCodeRaw } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCodeRaw } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

import {
  extendProgCodes,
  remapProgCodes,
} from "@/app/realGreen/progServ/_lib/func/progCodeServerFunc";
import {
  extendServCodes,
  remapServCode,
} from "@/app/realGreen/progServ/_lib/func/servCodeServerFunc";

const handlers: HandlerMap<ProgServContract> = {
  syncProgServ: {
    roles: ["office", "admin", "tech"],
    handler: async ({ progDefIds }) => {
      await connectToMongoDB();

      // 1. Check Cache Freshness
      const lastUpdated = await ProgServModel.findOne()
        .sort({ updatedAt: -1 })
        .lean();
      const isFresh =
        lastUpdated &&
        dateCompare.isWithinDays({
          dateLo: new Date(lastUpdated.updatedAt).toISOString(),
          dateHi: new Date().toISOString(),
          maxDiff: 0.5, // 12 hours approx (0.5 days)
          options: {
            valueUndefinedReturn: false,
            comparedToUndefinedReturn: false,
          },
        });

      if (isFresh) {
        const items = await ProgServModel.find({});

        return { success: true, payload: items };
      }

      // 2. Fetch from RealGreen (Throttled)
      const rawProgServs: RawProgServ[] = [];
      for (const id of progDefIds) {
        try {
          const result = await rgApi<RawProgServ[]>({
            path: `/ProgramCode/${id}/Services`,
            method: "GET",
          });
          if (Array.isArray(result)) {
            rawProgServs.push(...result);
          }
          await delay(10); // Throttle
        } catch (e) {
          console.warn(`Failed to fetch services for ProgDefId ${id}`, e);
        }
      }

      const remapped = remapProgServs(rawProgServs);

      // 3. Upsert to Mongo
      if (remapped.length > 0) {
        const bulkOps = remapped.map((doc) => ({
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
      return { success: true, payload: items };
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
      const progCodeCores = availableProgCodes.sort((a, b) =>
        a.progCodeId.localeCompare(b.progCodeId),
      );

      const progCodeDocs = await extendProgCodes(progCodeCores);

      return { success: true, payload: progCodeDocs };
    },
  },
  getServCodes: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawServCodes = await rgApi<ServCodeRaw[]>({
        path: "/ServiceCode",
        method: "GET",
      });

      const servCodeCores = rawServCodes.map(remapServCode);
      const servCodeDocs = await extendServCodes(servCodeCores);

      return { success: true, payload: servCodeDocs };
    },
  },
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OpMap<ProgServContract>;
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
