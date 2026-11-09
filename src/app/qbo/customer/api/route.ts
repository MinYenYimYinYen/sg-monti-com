import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboCustomerContract } from "@/app/qbo/customer/api/QboCustomerContract";
import { loadQboCustomers } from "@/app/qbo/customer/_lib/qboCustomerServer";

const handlers: HandlerMap<QboCustomerContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      return { success: true, payload: await loadQboCustomers() };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
