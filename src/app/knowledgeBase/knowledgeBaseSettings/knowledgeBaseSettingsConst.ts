/**
 * The placeholders the Ask Away prompt template may contain. The code fills them in when it builds
 * the prompt, because their values are contracts with the code (the tool's name), not wording.
 * Saving a template that omits one, or invents another, is refused.
 */
export const ASK_AWAY_PROMPT_TOKENS = ["markTopicsToolName"] as const;

export type AskAwayPromptToken = (typeof ASK_AWAY_PROMPT_TOKENS)[number];

export const MAX_APPROVERS = 50;
