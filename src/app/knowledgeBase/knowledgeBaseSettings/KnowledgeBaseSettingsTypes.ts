import type { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import type { UserSummary } from "@/permission/logic/userSummary";

// Person reference: `approvers` names the users who may approve documents. That is access, so it
// stores `userName`, and `deleteUserReferences` removes a deleted user from it (a name nobody can
// act as would otherwise block unanimous approval forever).

/**
 * Every setting and the shape of its value. Adding a setting is one entry here, one zod schema in
 * `knowledgeBaseSettingsSchema.ts` and one default in `knowledgeBaseSettingsDefaults.ts`.
 */
export type KnowledgeBaseSettingValues = {
  /** Users who approve documents. Order carries no meaning and there is no rank or title. */
  approvers: { approverUserNames: string[] };
  /** The Ask Away instructions. The topic list is appended by the code, never stored here. */
  askAwayPrompt: { template: string };
};

export type KnowledgeBaseSettingKey = keyof KnowledgeBaseSettingValues;

/**
 * Timestamps are absent while a setting has never been saved and the code default is being served.
 */
type KnowledgeBaseSettingDocByKey = {
  [Key in KnowledgeBaseSettingKey]: Partial<CreatedUpdated> & {
    settingKey: Key;
    value: KnowledgeBaseSettingValues[Key];
  };
};

/** A discriminated union on `settingKey`, so checking the key narrows `value`. */
export type KnowledgeBaseSettingDoc = KnowledgeBaseSettingDocByKey[KnowledgeBaseSettingKey];

export type KnowledgeBaseSettingDocOf<Key extends KnowledgeBaseSettingKey> = KnowledgeBaseSettingDocByKey[Key];

/** What a client sends to save one setting. */
export type KnowledgeBaseSettingInput = {
  [Key in KnowledgeBaseSettingKey]: { settingKey: Key; value: KnowledgeBaseSettingValues[Key] };
}[KnowledgeBaseSettingKey];

/**
 * The stored shape. `value` is `Mixed` because each setting has its own shape; the shape is checked by
 * zod on the way in and again on the way out (`parseSettingValue`), not by Mongoose.
 */
export type KnowledgeBaseSettingStoredDoc = CreatedUpdated & {
  settingKey: string;
  value: unknown;
};

/** A user who could be made an approver. An explicit field copy, never the user document. */
export type ApproverCandidate = Pick<UserSummary, "userName" | "firstName" | "lastName">;
