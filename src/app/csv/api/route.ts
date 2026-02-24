import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { CSVContract } from "@/app/csv/api/csvContract";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { ServiceDocPropsModel } from "@/app/realGreen/customer/_lib/models/ServiceDocPropsModel";
import {
  cleanMongoArray,
} from "@/lib/mongoose/cleanMongoObj";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { ServiceDocProps } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { baseServiceDocProps } from "@/app/realGreen/customer/_lib/entities/bases/baseService";
import { deepEqual } from "@/lib/primatives/typeUtils/deepEqual";
import { WriteError } from "mongodb";

const handlers: HandlerMap<CSVContract> = {
  saveAssignments: {
    roles: ["admin", "office"],
    handler: async ({ assignments }) => {
      const servIds = assignments.map((a) => a.servId);

      const servDocPropsDocs = await ServiceDocPropsModel.find({
        servId: { $in: servIds },
      }).lean();

      const servDocProps: ServiceDocProps[] = cleanMongoArray(servDocPropsDocs);
      const docPropsMap = new Grouper(servDocProps).toUniqueMap(
        (doc) => doc.servId,
      );

      const newServDocProps = assignments.map((a) => {
        const servDocProps = docPropsMap.get(a.servId) ?? baseServiceDocProps;
        const assignmentExists = servDocProps.assignments.some((existing) =>
          deepEqual(existing, a),
        );
        return {
          ...servDocProps,
          servId: a.servId,
          assignments: assignmentExists
            ? servDocProps.assignments
            : [...servDocProps.assignments, a],
        };
      });

      const updates = newServDocProps.map((doc) => ({
        updateOne: {
          filter: { servId: doc.servId },
          update: { $set: doc },
          upsert: true,
        },
      }));
      const result = await ServiceDocPropsModel.bulkWrite(updates);

      const hasErrors = result.hasWriteErrors();

      let errors: WriteError[] | null = null;
      if (hasErrors) {
        errors = result.getWriteErrors();
        console.error("Bulk write operation failed with errors:", { errors });
      }
      return {
        success: true,
        payload: {
          assignments: assignments,
          errors,
        },
      };
    },
  },
};

export const POST = createRpcHandler(handlers);
