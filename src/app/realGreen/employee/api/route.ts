import { EmployeeContract } from "@/app/realGreen/employee/api/EmployeeContract";
import { rgApi } from "@/app/realGreen/_lib/api/rgApi";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { EmployeeRaw } from "@/app/realGreen/employee/types/EmployeeTypes";
import {
  extendEmployees,
  remapEmployees,
} from "@/app/realGreen/employee/_lib/employeeServerFunc";
import { createRealGreenRpcHandler } from "@/app/realGreen/_lib/api/createRealGreenRpcHandler";
import { can } from "@/permission/can";
const handlers: HandlerMap<EmployeeContract> = {
  getAll: {
    capability: can.employees.read,
    handler: async (_params) => {
      // "Two-Hop" Source: Calling RealGreen
      // If rgApi throws an error, it bubbles up to the POST catch block
      const rawEmployees = await rgApi<EmployeeRaw[]>({
        path: "/Employee/Active/true",
        method: "GET",
        pathTemplate: "/Employee/Active/true",
      });

      const employeeCores = remapEmployees(rawEmployees);
      const employeeDocs = await extendEmployees(employeeCores);

      return { success: true, payload: employeeDocs };
    },
  },
};

export const POST = createRealGreenRpcHandler(handlers);
