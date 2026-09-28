import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { CSVContract } from "@/app/csv/api/csvContract";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

// The saveAssignments operation has been moved to assignment/api/route.ts.
// This file is kept as a placeholder for other CSV operations (deposits, general ledger).
// The CSVContract still references saveAssignments for backward compatibility during migration.

const handlers: HandlerMap<CSVContract> = {
  saveAssignments: {
    roles: ["admin", "office"],
    handler: async ({ assignments }) => {
      // This handler is no longer used — saveAssignments is now handled by
      // assignment/api/route.ts via AssignmentContract.saveAssignments.
      // Returning success with the passed assignments for backward compatibility.
      await connectToMongoDB();
      return {
        success: true,
        payload: {
          assignments,
          errors: null,
        },
      };
    },
  },
};

export const POST = createRpcHandler(handlers);
