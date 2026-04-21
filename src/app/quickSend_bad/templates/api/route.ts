import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { TemplateContract } from "./TemplateContract";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { TreeNodeModel } from "@/app/quickSend_bad/templates/TreeNodeModel";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import type { TreeNodeDoc } from "@/app/quickSend_bad/templates/TemplateTypes";

const handlers: HandlerMap<TemplateContract> = {
  getTreeNodes: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await TreeNodeModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },
  createNode: {
    roles: ["admin", "office", "tech"],
    handler: async ({ node }) => {
      await connectToMongoDB();
      const created = await TreeNodeModel.create(node);
      const payload = cleanMongoObject(created.toObject()) as TreeNodeDoc;
      return { success: true, payload };
    },
  },
  updateNode: {
    roles: ["admin", "office", "tech"],
    handler: async ({ node }) => {
      await connectToMongoDB();
      const updated = await TreeNodeModel.findOneAndUpdate(
        { nodeId: node.nodeId },
        { $set: node },
        { new: true, upsert: false },
      ).lean();
      if (!updated) {
        return { success: true, payload: node };
      }
      const payload = cleanMongoObject(updated) as TreeNodeDoc;
      return { success: true, payload };
    },
  },
  deleteNode: {
    roles: ["admin", "office", "tech"],
    handler: async ({ nodeId }) => {
      await connectToMongoDB();
      await TreeNodeModel.deleteOne({ nodeId });
      return { success: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
