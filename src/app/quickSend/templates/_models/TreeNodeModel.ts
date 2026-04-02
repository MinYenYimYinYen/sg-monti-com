import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";

const TreeNodeSchema = new mongoose.Schema<TreeNodeDoc>(
  {
    nodeId: { type: String, required: true, unique: true },
    parentId: { type: String, default: null },
    label: { type: String, required: true },
    type: { type: String, required: true, enum: ["category", "fragment"] },
    order: { type: Number, required: true, default: 0 },
    fragment: {
      blockId: { type: String },
      registryKey: { type: String },
      body: { type: String },
      subject: { type: String },
    },
  },
  { timestamps: true },
);

export const TreeNodeModel = createModel("TreeNode", TreeNodeSchema);
