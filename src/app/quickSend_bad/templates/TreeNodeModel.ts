import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { TreeNodeDoc } from "@/app/quickSend_bad/templates/TemplateTypes";

const BlockChoiceSchema = new mongoose.Schema(
  {
    choiceId: { type: Number, required: true, default: 1 },
    label: { type: String },
  },
  { _id: false },
);

const BlockGroupSchema = new mongoose.Schema(
  {
    groupId: { type: Number, required: true, default: 1 },
    label: { type: String },
  },
  { _id: false },
);

const TableColumnDefSchema = new mongoose.Schema(
  {
    field: { type: String, required: true },
    header: { type: String },
  },
  { _id: false },
);

const TableConfigSchema = new mongoose.Schema(
  {
    dataSource: { type: String, required: true, default: "progCode.servCodes" },
    showHeaders: { type: Boolean, required: true, default: false },
    columns: { type: [TableColumnDefSchema], default: [] },
  },
  { _id: false },
);

const FragmentBlockSchema = new mongoose.Schema(
  {
    blockKey: { type: String, required: true },
    label: { type: String },
    feature: { type: String, required: true },
    content: { type: String, default: "" },
    tableConfig: { type: TableConfigSchema },
    choice: { type: BlockChoiceSchema, required: true },
    group: { type: BlockGroupSchema, required: true },
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
