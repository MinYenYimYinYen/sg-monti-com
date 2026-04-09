import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { ServiceDocPropsModel } from "@/app/realGreen/customer/_lib/models/ServiceDocPropsModel";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

const handlers: HandlerMap<AssignmentContract> = {
  getByEmployeeIdAndSchedDate: {
    roles: ["office", "admin"],
    handler: async ({ employeeId, schedDate }) => {
      const docs = await ServiceDocPropsModel.find(
        {
          "assignments.employeeId": employeeId,
          "assignments.schedDate": schedDate,
        },
        { assignments: 1, _id: 0 },
      ).lean();

      const assignments: AssignmentDoc[] = docs.flatMap((doc) =>
        doc.assignments.filter(
          (a) => a.employeeId === employeeId && a.schedDate === schedDate,
        ),
      );

      return { success: true, payload: assignments };
    },
  },
};

export const POST = createRpcHandler(handlers);
