import { HandlerMap } from "@/lib/api/types/rpcUtils";
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
import ServCodeDocPropsModel from "@/app/realGreen/progServ/_lib/models/ServCodeDocPropsModel";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

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

      const available = rawServCodes.filter((sc) => sc.available);

      const servCodeCores = available.map(remapServCode);
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
          productRuleDocs:
            change.updated.productRuleDocs || change.original.productRuleDocs,
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
        await ServCodeDocPropsModel.bulkWrite(ops);
      }

      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
