import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboPurchaseContract } from "@/app/qbo/purchase/api/QboPurchaseContract";
import { loadQboPurchases } from "@/app/qbo/purchase/_lib/qboPurchaseServer";
import { qboPurchaseCapabilities } from "@/app/qbo/purchase/qboPurchaseCapabilities";

const { can } = qboPurchaseCapabilities;

const handlers: HandlerMap<QboPurchaseContract> = {
  getByDateRange: {
    capability: can.purchases.read,
    handler: async ({ startDate, endDate }) => {
      return { success: true, payload: await loadQboPurchases({ startDate, endDate }) };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
