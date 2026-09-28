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
        { assignments: 1, servId: 1, _id: 0 },
      ).lean();

      const operations = serviceDocs
        .filter((doc) => {
          const docWithAssignments = doc as typeof doc & { assignments?: unknown[] };
          return docWithAssignments.assignments?.length;
        })
        .map((doc) => {
          const docWithAssignments = doc as typeof doc & {
            servId?: number;
            assignments?: {
              servId: number;
              employeeId: string;
              schedDate: string;
              status: string;
              sequence: number;
              createdAt?: string;
            }[];
          };

          // Normalize assignments — add createdAt if missing (legacy data)
          const normalizedAssignments = docWithAssignments.assignments!.map((a, index) => ({
            servId: a.servId,
            employeeId: a.employeeId,
            schedDate: a.schedDate,
            status: a.status,
            sequence: a.sequence,
            // Legacy entries without createdAt get a synthetic timestamp spaced 1ms apart
            // to preserve relative ordering (earlier entries in the array = earlier uploads)
            createdAt:
              a.createdAt ||
              new Date(Date.now() - (docWithAssignments.assignments!.length - index) * 1).toISOString(),
          }));

          return {
            updateOne: {
              filter: { servId: normalizedAssignments[0]!.servId },
              update: { $set: { servId: normalizedAssignments[0]!.servId, assignments: normalizedAssignments } },
              upsert: true,
            },
          };
        });

      let migrated = 0;
      let skipped = 0;

      try {
        // ordered: false lets all operations run independently — a single failure won't abort the batch
        const result = await AssignmentModel.bulkWrite(operations, { ordered: false });
        migrated = result.upsertedCount + result.modifiedCount;
        skipped = operations.length - migrated;
      } catch (e) {
        console.error("[migrate] bulkWrite failed:", e);
        skipped = operations.length;
      }

      console.log(`[migrate] Assignment migration complete — ${migrated} documents migrated, ${skipped} skipped`);

      return { success: true, payload: { migrated, skipped } };
    },
  },
};

export const POST = createRpcHandler(handlers);
