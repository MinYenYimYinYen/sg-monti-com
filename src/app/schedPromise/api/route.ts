import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { SchedPromiseContract } from "@/app/schedPromise/api/SchedPromiseContract";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import SchedPromiseModel from "@/app/schedPromise/SchedPromiseModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { parsePromiseString } from "@/app/schedPromise/parsePromise";
import type { SchedPromise, PromiseIssue } from "@/app/schedPromise/SchedPromiseTypes";

const handlers: HandlerMap<SchedPromiseContract> = {
  getSchedPromises: {
    roles: ["office", "admin", "tech"],
    handler: async ({ entities }) => {
      await connectToMongoDB();

      const promises: SchedPromise[] = [];
      const issues: PromiseIssue[] = [];

      for (const entity of entities) {
        const { entityType, entityId, techNote } = entity;

        // Parse the tech note
        const parseResult = parsePromiseString({
          techNote,
          entityType,
          entityId,
        });

        // Handle the result
        if (parseResult.promise) {
          // Valid promise (even if it has warnings) - upsert to MongoDB
          await SchedPromiseModel.updateOne(
            { entityType, entityId },
            parseResult.promise,
            { upsert: true }
          );
          promises.push(parseResult.promise);
        } else {
          // No valid promise - delete from MongoDB if it exists
          await SchedPromiseModel.deleteOne({ entityType, entityId });
        }

        // Collect issues (both fatal and non-fatal)
        if (parseResult.issues.length > 0) {
          issues.push({
            entityType,
            entityId,
            messages: parseResult.issues,
          });
        }
      }

      // Clean MongoDB artifacts from promises
      const cleanedPromises = cleanMongoArray(promises);

      return {
        success: true,
        payload: {
          promises: cleanedPromises,
          issues,
        },
      };
    },
  },
};

export const POST = createRpcHandler(handlers);
