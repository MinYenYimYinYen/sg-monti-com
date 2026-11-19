import {
  ASK_AWAY_PROMPT_TOKENS,
  type AskAwayPromptToken,
} from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsConst";
import { KNOWLEDGE_BASE_SETTING_DEFAULTS } from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsDefaults";
import {
  KNOWLEDGE_BASE_SETTING_KEYS,
  knowledgeBaseSettingSchemas,
} from "@/app/knowledgeBase/knowledgeBaseSettings/knowledgeBaseSettingsSchema";
import type {
  KnowledgeBaseSettingDoc,
  KnowledgeBaseSettingKey,
  KnowledgeBaseSettingValues,
} from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsTypes";

// ---------------------------------------------------------------------------
// Reading settings
// ---------------------------------------------------------------------------

export type StoredSetting = { settingKey: string; value: unknown; createdAt?: string; updatedAt?: string };

export type SettingValueParse =
  | { ok: true; value: KnowledgeBaseSettingValues[KnowledgeBaseSettingKey] }
  | { ok: false; message: string };

export function isKnowledgeBaseSettingKey(settingKey: string): settingKey is KnowledgeBaseSettingKey {
  return (KNOWLEDGE_BASE_SETTING_KEYS as readonly string[]).includes(settingKey);
}

/** Checks a value against the schema of its key. Used on the way in and when reading what is stored. */
export function parseSettingValue({ settingKey, value }: { settingKey: string; value: unknown }): SettingValueParse {
  if (!isKnowledgeBaseSettingKey(settingKey)) {
    return { ok: false, message: `Unknown setting '${settingKey}'.` };
  }
  const result = knowledgeBaseSettingSchemas[settingKey].safeParse(value);
  if (!result.success) {
    return { ok: false, message: result.error.issues[0]?.message ?? `Invalid value for '${settingKey}'.` };
  }
  return { ok: true, value: result.data };
}

/**
 * One setting as the app sees it: the stored value, or the code default when nothing valid is
 * stored. A stored value that no longer parses falls back to the default instead of failing, so a
 * malformed document can never take Ask Away down.
 */
export function resolveSetting({
  settingKey,
  stored,
}: {
  settingKey: KnowledgeBaseSettingKey;
  stored: StoredSetting | undefined;
}): KnowledgeBaseSettingDoc {
  const parsed = stored ? parseSettingValue({ settingKey, value: stored.value }) : null;
  // The cast is the one place the key and its value are paired: `parseSettingValue` has just checked
  // the value against this key's schema, which TypeScript cannot follow through a key held in a variable.
  if (stored && parsed?.ok) {
    return {
      settingKey,
      value: parsed.value,
      createdAt: stored.createdAt,
      updatedAt: stored.updatedAt,
    } as KnowledgeBaseSettingDoc;
  }
  return { settingKey, value: KNOWLEDGE_BASE_SETTING_DEFAULTS[settingKey] } as KnowledgeBaseSettingDoc;
}

/**
 * Every registered setting, in registry order, with defaults for the ones never saved. The client can
 * therefore tell "not loaded yet" (an empty list) from "loaded" (always one doc per setting).
 */
export function resolveAllSettings({ storedDocs }: { storedDocs: StoredSetting[] }): KnowledgeBaseSettingDoc[] {
  const storedByKey = new Map(storedDocs.map((stored) => [stored.settingKey, stored]));
  return KNOWLEDGE_BASE_SETTING_KEYS.map((settingKey) =>
    resolveSetting({ settingKey, stored: storedByKey.get(settingKey) }),
  );
}

// ---------------------------------------------------------------------------
// Approvers
// ---------------------------------------------------------------------------

/** Trims, drops blanks and deduplicates, keeping the order given. */
export function normalizeApproverUserNames(userNames: string[]): string[] {
  const trimmed = userNames.map((userName) => userName.trim()).filter((userName) => userName.length > 0);
  return [...new Set(trimmed)];
}

/** The names that are not real users who can approve. Empty means the list is acceptable. */
export function findInvalidApproverUserNames({
  approverUserNames,
  eligibleUserNames,
}: {
  approverUserNames: string[];
  eligibleUserNames: string[];
}): string[] {
  const eligible = new Set(eligibleUserNames);
  return approverUserNames.filter((userName) => !eligible.has(userName));
}

/** Whether two lists name the same people, ignoring order. */
export function haveSameUserNames({ first, second }: { first: string[]; second: string[] }): boolean {
  if (first.length !== second.length) return false;
  const secondSet = new Set(second);
  return first.every((userName) => secondSet.has(userName));
}

// ---------------------------------------------------------------------------
// Ask Away prompt template
// ---------------------------------------------------------------------------

const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;

function placeholderLabel(token: string): string {
  return `{{${token}}}`;
}

/** Why a template cannot be saved. Empty means it is fine. */
export function findPromptTemplateProblems(template: string): string[] {
  const used = new Set<string>();
  for (const match of template.matchAll(PLACEHOLDER_PATTERN)) used.add(match[1]);

  const problems: string[] = [];
  for (const token of ASK_AWAY_PROMPT_TOKENS) {
    if (!used.has(token)) {
      problems.push(`The prompt must contain ${placeholderLabel(token)}, which the app replaces with a fixed value.`);
    }
  }
  for (const name of used) {
    if (!(ASK_AWAY_PROMPT_TOKENS as readonly string[]).includes(name)) {
      problems.push(`${placeholderLabel(name)} is not a known placeholder.`);
    }
  }
  return problems;
}

/** Fills in the placeholders. One this code does not know is left as written. */
export function renderPromptTemplate({
  template,
  values,
}: {
  template: string;
  values: Record<AskAwayPromptToken, string>;
}): string {
  const valuesByName = new Map<string, string>(Object.entries(values));
  return template.replace(PLACEHOLDER_PATTERN, (match, name: string) => valuesByName.get(name) ?? match);
}
