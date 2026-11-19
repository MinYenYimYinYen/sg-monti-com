import { z } from "zod";
import { MAX_SYSTEM_CHARS } from "@/app/anthropic/anthropicConst";
import { MAX_APPROVERS } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsConst";
import type {
  KnowledgeBaseSettingKey,
  KnowledgeBaseSettingValues,
} from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsTypes";

type SettingSchemas = { [Key in KnowledgeBaseSettingKey]: z.ZodType<KnowledgeBaseSettingValues[Key]> };

/** One schema per setting. The registry that says which keys exist and what their values look like. */
export const knowledgeBaseSettingSchemas: SettingSchemas = {
  approvers: z.object({
    approverUserNames: z.array(z.string().min(1)).max(MAX_APPROVERS),
  }),
  askAwayPrompt: z.object({
    template: z
      .string()
      .max(MAX_SYSTEM_CHARS)
      .refine((template) => template.trim().length > 0, "The prompt cannot be empty."),
  }),
};

export const KNOWLEDGE_BASE_SETTING_KEYS = Object.keys(knowledgeBaseSettingSchemas) as KnowledgeBaseSettingKey[];
