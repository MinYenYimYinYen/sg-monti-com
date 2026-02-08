import { NextRequest, NextResponse } from "next/server";
import { HandlerMap, OpMap } from "@/lib/api/types/rpcUtils";
import { normalizeError } from "@/lib/errors/errorHandler";
import { assertRole } from "@/app/auth/_lib/assertRole";
import { ProgServContract } from "@/app/realGreen/progServ/api/ProgServContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { ProgCodeRaw } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import {
  ServCodeDocProps,
  ServCodeRaw,
} from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

import {
  extendProgCodes,
  remapProgCodes,
} from "@/app/realGreen/progServ/_lib/func/progCodeServerFunc";
import {
  extendServCodes,
  remapServCode,
} from "@/app/realGreen/progServ/_lib/func/servCodeServerFunc";
import { syncProgServ } from "@/app/realGreen/progServ/api/syncProgServ";
import ServCodeModel from "@/app/realGreen/progServ/_lib/models/ServCodeModel";

type UpdatableServCodeProps = Omit<
  ServCodeDocProps,
  "servCodeId" | "createdAt" | "updatedAt"
>;

const handlers: HandlerMap<ProgServContract> = {
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
      const progServs = await syncProgServ(
        progCodeDocs.map((p) => p.progDefId),
      );

      return { success: true, payload: { progCodeDocs, progServs } };
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

  saveServCodeChanges: {
    roles: ["admin"],
    handler: async (params) => {
      const { unsavedChanges } = params;

      const ops = unsavedChanges.map((change) => {
        // Enforce that all updatable properties are present
        // If ServCodeDocProps changes, this will error until updated
        const updatePayload: UpdatableServCodeProps = {
          dateRange: change.updated.dateRange || change.original.dateRange,
          alwaysAsap:
            change.updated.alwaysAsap !== undefined
              ? change.updated.alwaysAsap
              : change.original.alwaysAsap,
          productDocs:
            change.updated.productDocs || change.original.productDocs,
        };

        return {
          updateOne: {
            filter: { servCodeId: change.updated.servCodeId },
            update: {
              $set: {
                ...updatePayload,
              },
            },
            upsert: true,
          },
        };
      });

      if (ops.length > 0) {
        await ServCodeModel.bulkWrite(ops);
      }

      return { success: true, payload: true };
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
