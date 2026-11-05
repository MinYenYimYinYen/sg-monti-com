import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboVendorContract } from "@/app/qbo/vendor/api/QboVendorContract";
import { loadQboVendors } from "@/app/qbo/vendor/_lib/qboVendorServer";
import { createQboVendor } from "@/app/qbo/vendor/_lib/qboVendorCreateServer";

const handlers: HandlerMap<QboVendorContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      return { success: true, payload: await loadQboVendors() };
    },
  },

  // Writing to the real books is admin only (decided with the user). Widen the roles
  // deliberately, not by copying from getAll.
  createVendor: {
    roles: ["admin"],
    handler: async ({ displayName }) => {
      return { success: true, payload: await createQboVendor({ displayName }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
