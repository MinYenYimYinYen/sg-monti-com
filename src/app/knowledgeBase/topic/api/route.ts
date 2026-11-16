import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { TopicContract } from "@/app/knowledgeBase/topic/api/TopicContract";
import { TopicModel } from "@/app/knowledgeBase/topic/TopicModel";
import { TopicDetailModel } from "@/app/knowledgeBase/topicDetail/TopicDetailModel";
import {
  buildTopicInUseMessage,
  isValidTopicKey,
  normalizeSignals,
  TOPIC_KEY_RULE,
} from "@/app/knowledgeBase/topic/topicLogic";
import { AppError } from "@/lib/errors/AppError";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

const handlers: HandlerMap<TopicContract> = {
  getAll: {
    capability: can.knowledgeTopics.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await TopicModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: can.knowledgeTopics.write,
    handler: async (params) => {
      await connectToMongoDB();
      const { topicKey, signals, ...rest } = params;
      if (!isValidTopicKey(topicKey)) {
        throw validationError(`Invalid topic key '${topicKey}'. ${TOPIC_KEY_RULE}`);
      }
      // An upsert saves the whole topic, so signals left out means no signals, never "keep the old ones".
      const doc = await TopicModel.findOneAndUpdate(
        { topicKey },
        { $set: { topicKey, ...rest, signals: normalizeSignals(signals ?? []) } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  remove: {
    capability: can.knowledgeTopics.delete,
    handler: async ({ topicKey }) => {
      await connectToMongoDB();
      // Documents are tagged by topic key, so deleting a referenced topic would leave them pointing at nothing.
      const referencingDetails = await TopicDetailModel.find({ topicKeys: topicKey })
        .select("detailKey title")
        .sort({ detailKey: 1 })
        .lean();
      if (referencingDetails.length > 0) {
        throw validationError(buildTopicInUseMessage({ topicKey, referencingDetails }));
      }
      await TopicModel.deleteOne({ topicKey });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
