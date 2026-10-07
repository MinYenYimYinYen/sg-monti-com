import mongoose, { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { AssignmentGroupDoc } from "@/app/pace/assignmentGroup/AssignmentGroupTypes";

const AssignmentGroupSchema = new Schema<AssignmentGroupDoc>(
  {
    groupId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    servCodeIds: { type: [String], required: true },
  },
  { _id: false },
);

// modelName "AssignmentGroup" matches the original — no collection rename, no migration needed.
export const AssignmentGroupModel = createModel<AssignmentGroupDoc>(
  "AssignmentGroup",
  AssignmentGroupSchema,
);
