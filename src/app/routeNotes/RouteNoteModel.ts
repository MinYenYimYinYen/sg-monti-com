import mongoose from "mongoose";
import { RouteNote } from "@/app/routeNotes/RouteNoteTypes";
import { createModel } from "@/lib/mongoose/createModel";

const RouteNoteSchema = new mongoose.Schema<RouteNote>(
  {
    routeNoteId: { type: String, required: true },
    schedDate: { type: String, required: true },
    employeeId: { type: String, default: null },
    noteHtml: { type: String, required: true, default: "" },
    note: { type: String, required: true, default: "" },
    showOnCoverSheet: { type: Boolean, required: true, default: true },
    showInCrewLeadSummary: { type: Boolean, required: true, default: true },
  },
  { timestamps: true },
);

RouteNoteSchema.index({ routeNoteId: 1 }, { unique: true });
RouteNoteSchema.index({ schedDate: 1 });

export const RouteNoteModel = createModel("RouteNote", RouteNoteSchema);
