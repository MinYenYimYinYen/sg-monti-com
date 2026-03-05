import mongoose from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { CallAheadKeyword } from "@/app/realGreen/callAhead/_lib/ext/CallAheadExtTypes";

const CallAheadKeywordSchema = new mongoose.Schema<CallAheadKeyword>({
  keywordId: { type: String, required: true, unique: true },
  message: { type: String, required: true },
});

export const CallAheadKeywordModel = createModel(
  "CallAheadKeyword",
  CallAheadKeywordSchema,
);
