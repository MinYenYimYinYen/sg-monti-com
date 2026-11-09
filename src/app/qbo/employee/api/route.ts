import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { QboEmployeeContract } from "@/app/qbo/employee/api/QboEmployeeContract";
import { loadQboEmployees } from "@/app/qbo/employee/_lib/qboEmployeeServer";

const handlers: HandlerMap<QboEmployeeContract> = {
  getAll: {
    roles: ["office", "admin"],
    handler: async () => {
      return { success: true, payload: await loadQboEmployees() };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
