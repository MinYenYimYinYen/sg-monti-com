import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { TopicContract } from "@/app/knowledgeBase/api/TopicContract";
import { TopicModel } from "@/app/knowledgeBase/TopicModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";

const handlers: HandlerMap<TopicContract> = {
  getAll: {
    roles: ["admin", "office"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await TopicModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    roles: ["admin"],
    handler: async (params) => {
      await connectToMongoDB();
      const { topicKey, ...rest } = params;
      const doc = await TopicModel.findOneAndUpdate(
        { topicKey },
        { $set: { topicKey, ...rest } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  remove: {
    roles: ["admin"],
    handler: async ({ topicKey }) => {
      await connectToMongoDB();
      await TopicModel.deleteOne({ topicKey });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
