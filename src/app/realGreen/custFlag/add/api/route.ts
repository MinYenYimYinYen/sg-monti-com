import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { CustFlagAddContract } from "@/app/realGreen/custFlag/add/CustFlagAddContract";
import { CustFlagAdd } from "@/app/realGreen/custFlag/_lib/CustFlagTypes";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";

const handlers: HandlerMap<CustFlagAddContract> = {
  addCustFlag: {
    roles: ["office", "admin"],
    handler: async ({ custIds, flagId }) => {
      // Translate app conventions → RealGreen field names
      await rgApi<boolean>({
        path: "/Customer/Flags/Add",
        method: "POST",
        body: { customerNumbers: custIds, flag: flagId } as { customerNumbers: number[]; flag: number },
        pathTemplate: "/Customer/Flags/Add",
      });

      // RealGreen returns a boolean (always true on success; invalid custIds are silently skipped).
      // We return the app-shaped payload so the slice can update state directly.
      const result: CustFlagAdd = { custIds, flagId };
      return { success: true, payload: result };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
