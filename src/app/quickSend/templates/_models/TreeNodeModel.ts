import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";

const FragmentBlockSchema = new mongoose.Schema(
  {
    blockKey: { type: String, required: true },
    label: { type: String },
    feature: { type: String, required: true },
    content: { type: String, default: "" },
    blockId: { type: Number, required: true, default: 1 },
  },
  { _id: false },
);

const TreeNodeSchema = new mongoose.Schema<TreeNodeDoc>(
  {
    nodeId: { type: String, required: true, unique: true },
    parentId: { type: String, default: null },
    label: { type: String, required: true },
    type: { type: String, required: true, enum: ["category", "fragment"] },
    order: { type: Number, required: true, default: 0 },
    fragment: {
      registryKey: { type: String },
      dataFeatures: [{ type: String }],
      blocks: [FragmentBlockSchema],
    },
  },
  { timestamps: true },
);

export const TreeNodeModel = createModel("TreeNode", TreeNodeSchema);
