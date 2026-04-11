import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { ServiceDocPropsModel } from "@/app/realGreen/customer/_lib/models/ServiceDocPropsModel";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<AssignmentContract> = {
  getByEmployeeIdAndSchedDate: {
    roles: ["office", "admin"],
    handler: async ({ employeeId, schedDate }) => {
      await connectToMongoDB();
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

  getBySchedDate: {
    roles: ["office", "admin"],
    handler: async ({ schedDate }) => {
      await connectToMongoDB();
      const docs = await ServiceDocPropsModel.find(
        { "assignments.schedDate": schedDate },
        { assignments: 1, _id: 0 },
      ).lean();

      const assignments: AssignmentDoc[] = docs.flatMap((doc) =>
        doc.assignments.filter((a) => a.schedDate === schedDate),
      );

      return { success: true, payload: assignments };
    },
  },

  getAvailableDates: {
    roles: ["office", "admin"],
    handler: async ({ season }) => {
      await connectToMongoDB();
      // Derive year bounds from season (season = calendar year)
      const minDate = `${season}-01-01`;
      const maxDate = `${season}-12-31`;

      const docs = await ServiceDocPropsModel.find(
        {
          "assignments.schedDate": { $gte: minDate, $lte: maxDate },
        },
        { "assignments.schedDate": 1, _id: 0 },
      ).lean();

      const dateSet = new Set<string>();
      for (const doc of docs) {
        for (const assignment of doc.assignments) {
          if (assignment.schedDate >= minDate && assignment.schedDate <= maxDate) {
            dateSet.add(assignment.schedDate);
          }
        }
      }

      const dates = Array.from(dateSet).sort();
      return { success: true, payload: dates };
    },
  },
};

export const POST = createRpcHandler(handlers);
