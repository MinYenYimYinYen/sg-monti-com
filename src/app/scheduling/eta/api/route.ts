import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { ServiceEtaContract } from "@/app/scheduling/eta/api/ServiceEtaContract";
import { ServiceEtaModel } from "@/app/scheduling/eta/api/ServiceEtaModel";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { ServiceEta } from "@/app/scheduling/eta/EtaTypes";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";
import { createRpcHandler } from "@/lib/api/createRpcHandler";

const handlers: HandlerMap<ServiceEtaContract> = {
  getServiceEtas: {
    roles: ["admin", "office", "tech"],
    handler: async ({ servIds }) => {
      await connectToMongoDB();
      const docs = await ServiceEtaModel.find({
        servId: { $in: servIds },
      }).lean();
      const serviceEtas: ServiceEta[] = cleanMongoArray(docs);
      return { success: true, payload: serviceEtas };
    },
  },
  saveServiceEta: {
    roles: ["admin", "office"],
    handler: async ({ servId, eta }) => {
      await connectToMongoDB();
      await ServiceEtaModel.findOneAndUpdate(
        { servId },
        { $pull: { etas: { invoice: eta.invoice } } },
        { upsert: true, new: false },
      );
      const updated = await ServiceEtaModel.findOneAndUpdate(
        { servId },
        { $push: { etas: eta } },
        { upsert: true, new: true },
      ).lean();
      const serviceEta: ServiceEta = updated;
      return { success: true, payload: serviceEta };
    },
  },
};

export const POST = createRpcHandler(handlers);

