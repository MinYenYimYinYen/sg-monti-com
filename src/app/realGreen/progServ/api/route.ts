import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ProgServContract } from "@/app/realGreen/progServ/api/ProgServContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { ProgCodeRaw } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import { ServCodeRaw } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";

import {
  extendProgCodes,
  remapProgCodes,
} from "@/app/realGreen/progServ/progCode/_func/progCodeServerFunc";
import {
  extendServCodes,
  remapServCode,
} from "@/app/realGreen/progServ/servCode/_func/servCodeServerFunc";
import { syncProgServ } from "@/app/realGreen/progServ/api/syncProgServ";
import ServCodeDocPropsModel from "@/app/realGreen/progServ/_lib/models/ServCodeDocPropsModel";
import { ProgCodeDocPropsModel } from "@/app/realGreen/progServ/_lib/models/ProgCodeDocPropsModel";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

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
        // Strip identity and timestamp fields; everything remaining is a user-editable DocProps field.
        const { servCodeId, createdAt, updatedAt, ...docProps } = change.updated;

        return {
          updateOne: {
            filter: { servCodeId },
            update: { $set: { ...docProps } },
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

  saveProgCodeChanges: {
    roles: ["admin"],
    handler: async (params) => {
      const { unsavedChanges } = params;

      const ops = unsavedChanges.map((change) => {
        // Strip identity and timestamp fields; everything remaining is a user-editable DocProps field.
        const { progCodeId, createdAt, updatedAt, ...docProps } = change.updated;

        return {
          updateOne: {
            filter: { progCodeId },
            update: { $set: { ...docProps } },
            upsert: true,
          },
        };
      });

      if (ops.length > 0) {
        await ProgCodeDocPropsModel.bulkWrite(ops);
      }

      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
