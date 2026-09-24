import mongoose from "mongoose";
import { CallLogDoc, CallLogNoteCore } from "@/app/realGreen/callLog/CallLogTypes";
import { createModel } from "@/lib/mongoose/createModel";

// Embedded subdocument schema for notes.
// { _id: false } prevents Mongoose from adding an _id to each note subdocument.
const CallLogNoteSchema = new mongoose.Schema<CallLogNoteCore>(
  {
    callLogNoteId: { type: Number, required: true },
    callLogId: { type: Number, required: true },
    date: { type: String, default: "" },
    reason: { type: String, default: "" },
    note: { type: String, default: "" },
    employeeId: { type: String, default: "" },
  },
  { _id: false },
);

const CallLogSchema = new mongoose.Schema<CallLogDoc>(
  {
    callLogId: { type: Number, required: true, unique: true },
    custId: { type: Number, required: true },
    enterDate: { type: String, required: true },
    dueDate: { type: String, default: "" },
    resolved: { type: Boolean, default: false },
    viewed: { type: Boolean, default: false },
    alarmSet: { type: Boolean, default: false },
    status: { type: String, default: "" },
    enteredBy: { type: String, default: "" },
    assignedTo: { type: String, default: "" },
    notes: { type: [CallLogNoteSchema], default: [] },
  },
  { timestamps: true },
);

// Index for efficient customer-scoped queries (the primary access pattern).
CallLogSchema.index({ custId: 1 });

export const CallLogModel = createModel("CallLog", CallLogSchema);
