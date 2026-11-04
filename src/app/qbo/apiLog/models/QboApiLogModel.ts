import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { QboApiLogDoc } from "@/app/qbo/apiLog/types/QboApiLogTypes";

const QboApiLogSchema = new Schema<QboApiLogDoc>(
  {
    logId: { type: String, required: true, unique: true, index: true },
    loggedAt: { type: String, required: true },
    operation: { type: String, required: true },
    kind: { type: String, required: true, enum: ["api", "oauthToken", "oauthRevoke"] },
    method: { type: String, required: true, enum: ["GET", "POST"] },
    pathTemplate: { type: String, required: true },
    realmId: { type: String, default: null },
    httpStatus: { type: Number, required: true },
    outcome: { type: String, required: true, enum: ["success", "httpError", "networkError"] },
    intuitTid: { type: String, default: null, index: true },
    durationMs: { type: Number, required: true },
    faultType: { type: String, default: null },
    faultErrors: [
      {
        _id: false,
        code: { type: String, default: "" },
        message: { type: String, default: "" },
        detail: { type: String, default: "" },
        element: { type: String, default: "" },
      },
    ],
    expireAt: { type: Date, required: true },
  },
  { timestamps: true },
);

// Mongo deletes each record once its own expireAt passes (0 seconds after that time).
QboApiLogSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
// For the Phase F viewer: newest first.
QboApiLogSchema.index({ loggedAt: -1 });

export const QboApiLogModel = createModel<QboApiLogDoc>("QboApiLog", QboApiLogSchema);
