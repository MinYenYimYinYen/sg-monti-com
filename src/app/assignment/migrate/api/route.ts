import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import { ServiceDocPropsModel } from "@/app/realGreen/customer/_lib/models/ServiceDocPropsModel";
import { AssignmentModel } from "@/app/assignment/AssignmentModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

interface MigrateAssignmentsContract extends ApiContract {
  migrateAssignments: {
    params: Record<string, never>;
    result: DataResponse<{ migrated: number; skipped: number }>;
  };
}

const handlers: HandlerMap<MigrateAssignmentsContract> = {
  migrateAssignments: {
    roles: ["admin"],
    handler: async () => {
      await connectToMongoDB();

      // Read all ServiceDocProps documents that have assignments
      const serviceDocs = await ServiceDocPropsModel.find(
        { "assignments.0": { $exists: true } },
        { assignments: 1, _id: 0 },
      ).lean();

      let migrated = 0;
      let skipped = 0;

      for (const doc of serviceDocs) {
        const docWithAssignments = doc as typeof doc & { assignments?: { servId: number; employeeId: string; schedDate: string; status: string; sequence: number }[] };
        for (const assignment of docWithAssignments.assignments ?? []) {
          try {
            await AssignmentModel.updateOne(
              { servId: assignment.servId },
              { $set: assignment },
              { upsert: true },
            );
            migrated++;
          } catch (e) {
            console.error(`[migrate] Failed to migrate assignment for servId ${assignment.servId}:`, e);
            skipped++;
          }
        }
      }

      console.log(`[migrate] Assignment migration complete — ${migrated} migrated, ${skipped} skipped`);

      return { success: true, payload: { migrated, skipped } };
    },
  },
};

export const POST = createRpcHandler(handlers);
