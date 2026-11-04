import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboVendorContract } from "@/app/qbo/vendor/api/QboVendorContract";
import { loadQboVendors } from "@/app/qbo/vendor/_lib/qboVendorServer";

const handlers: HandlerMap<QboVendorContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      return { success: true, payload: await loadQboVendors() };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
