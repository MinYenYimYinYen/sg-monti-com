import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import { QboOAuthStateDoc } from "@/app/qbo/connection/types/QboConnectionTypes";

const QboOAuthStateSchema = new Schema<QboOAuthStateDoc>(
  {
    state: { type: String, required: true, unique: true, index: true },
    userName: { type: String, required: true },
    // ISO string like every other date. Expired rows are swept when a new connection
    // starts rather than by a TTL index, which would need a real Date field.
    expiresAt: { type: String, required: true },
  },
  { timestamps: true },
);

export const QboOAuthStateModel = createModel<QboOAuthStateDoc>(
  "QboOAuthState",
  QboOAuthStateSchema,
);
