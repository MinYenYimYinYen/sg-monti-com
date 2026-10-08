import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { GroupSequence } from "@/app/pace/groupSequence/GroupSequenceTypes";

const GroupSequenceSchema = new Schema<GroupSequence>(
  {
    sequenceId: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    groupIds: { type: [String], required: true },
    daysSince: { type: Number, default: 0 },
  },
  { _id: false },
);

// New collection — starts empty, no migration needed.
export const GroupSequenceModel = createModel<GroupSequence>(
  "GroupSequence",
  GroupSequenceSchema,
);
