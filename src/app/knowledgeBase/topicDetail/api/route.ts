import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import { TopicDetailContract } from "@/app/knowledgeBase/topicDetail/api/TopicDetailContract";
import { TopicDetailModel } from "@/app/knowledgeBase/topicDetail/TopicDetailModel";
import { TopicModel } from "@/app/knowledgeBase/topic/TopicModel";
import {
  buildDetailKey,
  findUnknownTopicKeys,
  normalizeTopicKeys,
} from "@/app/knowledgeBase/topicDetail/topicDetailLogic";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

const handlers: HandlerMap<TopicDetailContract> = {
  getAll: {
    capability: can.knowledgeTopics.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await TopicDetailModel.find().lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  upsert: {
    capability: can.knowledgeTopics.write,
    handler: async ({ topicKeys, title, contentHtml }) => {
      const normalizedTopicKeys = normalizeTopicKeys(topicKeys);
      if (normalizedTopicKeys.length === 0) {
        throw validationError("Choose at least one topic for this document.");
      }
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        throw validationError("A title is required.");
      }

      await connectToMongoDB();
      const existingTopics = await TopicModel.find({ topicKey: { $in: normalizedTopicKeys } })
        .select("topicKey")
        .lean();
      const unknownTopicKeys = findUnknownTopicKeys({
        topicKeys: normalizedTopicKeys,
        knownTopicKeys: existingTopics.map((topic) => topic.topicKey),
      });
      if (unknownTopicKeys.length > 0) {
        throw validationError(`These topics do not exist: ${unknownTopicKeys.join(", ")}.`);
      }

      const detailKey = buildDetailKey(normalizedTopicKeys);
      const doc = await TopicDetailModel.findOneAndUpdate(
        { detailKey },
        { $set: { detailKey, topicKeys: normalizedTopicKeys, title: trimmedTitle, contentHtml } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(doc!) };
    },
  },

  remove: {
    capability: can.knowledgeTopics.delete,
    handler: async ({ detailKey }) => {
      await connectToMongoDB();
      await TopicDetailModel.deleteOne({ detailKey });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
