import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboVendorContract } from "@/app/qbo/vendor/api/QboVendorContract";
import { loadQboVendors } from "@/app/qbo/vendor/_lib/qboVendorServer";
import { createQboVendor } from "@/app/qbo/vendor/_lib/qboVendorCreateServer";
import { can } from "@/permission/can";

const handlers: HandlerMap<QboVendorContract> = {
  getAll: {
    capability: can.qboVendors.read,
    handler: async () => {
      return { success: true, payload: await loadQboVendors() };
    },
  },

  // Writing to the real books was admin only (decided with the user), so vendors.write is its own
  // capability. Assign it deliberately, never by copying what a read-only bundle holds.
  createVendor: {
    capability: can.qboVendors.write,
    handler: async ({ displayName }) => {
      return { success: true, payload: await createQboVendor({ displayName }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
