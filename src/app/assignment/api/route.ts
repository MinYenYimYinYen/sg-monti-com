import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { AssignmentModel } from "@/app/assignment/AssignmentModel";
import { AssignmentDoc, ServiceAssignmentDoc } from "@/app/assignment/AssignmentTypes";
import { AssignmentUtils } from "@/app/assignment/AssignmentUtils";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { WriteError } from "mongodb";

const handlers: HandlerMap<AssignmentContract> = {
  getByServIds: {
    roles: ["office", "admin", "tech"],
    handler: async ({ servIds }) => {
      await connectToMongoDB();
      if (!servIds.length) return { success: true, payload: [] };
      const docs = await AssignmentModel.find({ servId: { $in: servIds } }).lean();
      return { success: true, payload: cleanMongoArray(docs) as ServiceAssignmentDoc[] };
    },
  },

  getBySchedDate: {
    roles: ["office", "admin", "tech"],
    handler: async ({ schedDate }) => {
      await connectToMongoDB();
      const docs = await AssignmentModel.find({
        "assignments.schedDate": schedDate,
      }).lean();
      return { success: true, payload: cleanMongoArray(docs) as ServiceAssignmentDoc[] };
    },
  },

  getAvailableDates: {
    roles: ["office", "admin", "tech"],
    handler: async ({ season }) => {
      await connectToMongoDB();
      const minDate = `${season}-01-01`;
      const maxDate = `${season}-12-31`;
      const docs = await AssignmentModel.find(
        { "assignments.schedDate": { $gte: minDate, $lte: maxDate } },
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
      return { success: true, payload: Array.from(dateSet).sort() };
    },
  },

  getBySchedDateRange: {
    roles: ["office", "admin", "tech"],
    handler: async ({ dateRange }) => {
      await connectToMongoDB();
      const docs = await AssignmentModel.find({
        "assignments.schedDate": { $gte: dateRange.min, $lte: dateRange.max },
      }).lean();
      return { success: true, payload: cleanMongoArray(docs) as ServiceAssignmentDoc[] };
    },
  },

  saveAssignments: {
    roles: ["admin", "office"],
    handler: async ({ assignments }) => {
      await connectToMongoDB();

      const servIds = assignments.map((a) => a.servId);
      const existingDocs = await AssignmentModel.find({ servId: { $in: servIds } }).lean();
      const existingMap = new Map(existingDocs.map((doc) => [doc.servId, doc.assignments]));

      const now = new Date().toISOString();
      const errors: WriteError[] = [];
      const savedAssignments: AssignmentDoc[] = [];

      for (const assignment of assignments) {
        const existingAssignments = existingMap.get(assignment.servId) ?? [];
        const utils = new AssignmentUtils(existingAssignments);

        // Skip if identical to the most recent entry (idempotent upload guard)
        if (utils.isDuplicate(assignment)) {
          const recent = utils.mostRecent;
          if (recent) savedAssignments.push(recent);
          continue;
        }

        const newEntry: AssignmentDoc = {
          ...assignment,
          createdAt: now,
        };

        try {
          await AssignmentModel.updateOne(
            { servId: assignment.servId },
            { $push: { assignments: newEntry } },
            { upsert: true },
          );
          savedAssignments.push(newEntry);
        } catch (e) {
          console.error(`Assignment write error for servId ${assignment.servId}:`, e);
          errors.push(e as WriteError);
        }
      }

      if (errors.length > 0) {
        console.error("Assignment bulk write had errors:", { count: errors.length });
      }

      return {
        success: true,
        payload: {
          assignments: savedAssignments,
          errors: errors.length > 0 ? errors : null,
        },
      };
    },
  },
};

export const POST = createRpcHandler(handlers);
