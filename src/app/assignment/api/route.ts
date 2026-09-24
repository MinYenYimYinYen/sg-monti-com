import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AssignmentContract } from "@/app/assignment/api/AssignmentContract";
import { AssignmentModel } from "@/app/assignment/AssignmentModel";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";
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
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  getBySchedDate: {
    roles: ["office", "admin", "tech"],
    handler: async ({ schedDate }) => {
      await connectToMongoDB();
      const docs = await AssignmentModel.find({ schedDate }).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  getAvailableDates: {
    roles: ["office", "admin", "tech"],
    handler: async ({ season }) => {
      await connectToMongoDB();
      const minDate = `${season}-01-01`;
      const maxDate = `${season}-12-31`;
      const docs = await AssignmentModel.find(
        { schedDate: { $gte: minDate, $lte: maxDate } },
        { schedDate: 1, _id: 0 },
      ).lean();
      const dateSet = new Set<string>();
      for (const doc of docs) {
        dateSet.add(doc.schedDate);
      }
      return { success: true, payload: Array.from(dateSet).sort() };
    },
  },

  getBySchedDateRange: {
    roles: ["office", "admin", "tech"],
    handler: async ({ dateRange }) => {
      await connectToMongoDB();
      const docs = await AssignmentModel.find({
        schedDate: { $gte: dateRange.min, $lte: dateRange.max },
      }).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  saveAssignments: {
    roles: ["admin", "office"],
    handler: async ({ assignments }) => {
      await connectToMongoDB();

      const updates = assignments.map((assignment) => ({
        updateOne: {
          filter: { servId: assignment.servId },
          update: { $set: assignment },
          upsert: true,
        },
      }));

      const result = await AssignmentModel.bulkWrite(updates);

      let errors: WriteError[] | null = null;
      if (result.hasWriteErrors()) {
        errors = result.getWriteErrors();
        console.error("Assignment bulk write errors:", { errors });
      }

      return {
        success: true,
        payload: {
          assignments,
          errors,
        },
      };
    },
  },
};

export const POST = createRpcHandler(handlers);
