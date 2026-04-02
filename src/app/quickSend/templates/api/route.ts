import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { TemplateContract } from "./TemplateContract";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { TreeNodeModel } from "@/app/quickSend/templates/_models/TreeNodeModel";
import { cleanMongoArray } from "@/lib/mongoose/cleanMongoObj";

const handlers: HandlerMap<TemplateContract> = {
  getTreeNodes: {
    roles: ["admin", "office", "tech"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await TreeNodeModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },
};

export const POST = createRpcHandler(handlers);
