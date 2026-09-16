import { EmployeeAvailabilityContract } from "@/app/employeeAvailability/api/EmployeeAvailabilityContract";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { EmployeeAvailabilityModel } from "@/app/employeeAvailability/EmployeeAvailabilityModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { EmployeeAvailability } from "@/app/employeeAvailability/EmployeeAvailabilityTypes";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<EmployeeAvailabilityContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await EmployeeAvailabilityModel.find({}).lean();
      return { success: true, payload: cleanMongoArray<EmployeeAvailability>(docs) };
    },
  },
  upsert: {
    roles: ["admin", "office"],
    handler: async ({ doc }) => {
      await connectToMongoDB();
      const saved = await EmployeeAvailabilityModel.findOneAndUpdate(
        { employeeId: doc.employeeId },
        { $set: doc },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject<EmployeeAvailability>(saved!) };
    },
  },
  deleteOne: {
    roles: ["admin", "office"],
    handler: async ({ employeeId }) => {
      await connectToMongoDB();
      const deleted = await EmployeeAvailabilityModel.findOneAndDelete({ employeeId }).lean();
      return { success: true, payload: cleanMongoObject<EmployeeAvailability>(deleted!) };
    },
  },
};

export const POST = createRpcHandler<EmployeeAvailabilityContract>(handlers);
