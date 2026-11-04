import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { QboConnectionDoc } from "@/app/qbo/connection/types/QboConnectionTypes";

const QboConnectionSchema = new Schema<QboConnectionDoc>(
  {
    realmId: { type: String, required: true, unique: true, index: true },
    environment: { type: String, required: true, enum: ["sandbox", "production"] },
    status: { type: String, required: true, enum: ["connected", "reconnectRequired"] },
    // Blank (not absent) once the grant is gone, so the document can still show who connected and when.
    accessTokenEnc: { type: String, default: "" },
    refreshTokenEnc: { type: String, default: "" },
    accessTokenExpiresAt: { type: String, required: true },
    refreshTokenExpiresAt: { type: String, required: true },
    connectedByUserName: { type: String, required: true },
    connectedAt: { type: String, required: true },
    version: { type: Number, required: true, default: 1 },
    refreshLockUntil: { type: String, default: "" },
  },
  { timestamps: true },
);

export const QboConnectionModel = createModel<QboConnectionDoc>(
  "QboConnection",
  QboConnectionSchema,
);
