import mongoose from "mongoose";
import {PasswordResetRequest} from "@/app/auth/_types/PasswordResetRequest";

export interface PasswordResetRequestDoc
  extends mongoose.Document,
    PasswordResetRequest {}

const PasswordResetRequestSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true },
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  },
);

// Prevent multiple pending requests for the same user
PasswordResetRequestSchema.index(
  { userName: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } },
);

const PasswordResetRequestModel =
  (mongoose.models
    ?.PasswordResetRequest as mongoose.Model<PasswordResetRequestDoc>) ||
  mongoose.model<PasswordResetRequestDoc>(
    "PasswordResetRequest",
    PasswordResetRequestSchema,
  );

export default PasswordResetRequestModel;
