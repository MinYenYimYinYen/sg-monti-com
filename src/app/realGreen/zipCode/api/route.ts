import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { ZipCodeContract } from "@/app/realGreen/zipCode/api/ZipCodeContract";
import { ZipCodeRaw } from "../_lib/ZipCodeTypes";
import { extendZipCodes, remapZipCodes } from "@/app/realGreen/zipCode/_lib/zipCodeServerFunc";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<ZipCodeContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      const rawZipCodes = await rgApi<ZipCodeRaw[]>({
        path: "/ZipCode",
        method: "GET",
      });

      const coreZipCodes = remapZipCodes(rawZipCodes);
      const zipCodes = await extendZipCodes(coreZipCodes);

      return { success: true, payload: zipCodes };
    },
  },
};

export const POST = createRpcHandler(handlers);
