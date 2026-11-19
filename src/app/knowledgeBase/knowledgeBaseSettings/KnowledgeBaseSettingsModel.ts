import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { KnowledgeBaseSettingStoredDoc } from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsTypes";

// One document per setting. `value` is Mixed on purpose: each setting has its own shape, which zod
// checks (knowledgeBaseSettingsSchema.ts). `minimize: false` keeps an empty approver list as `[]`.
const KnowledgeBaseSettingSchema = new Schema<KnowledgeBaseSettingStoredDoc>(
  {
    settingKey: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true, minimize: false },
);

export const KnowledgeBaseSettingModel = createModel<KnowledgeBaseSettingStoredDoc>(
  "KnowledgeBaseSetting",
  KnowledgeBaseSettingSchema,
);
