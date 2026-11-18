/** How long a session list counts as fresh, so remounting a screen does not refetch. */
export const CLAUDE_SESSION_STALE_MS = 5 * 60 * 1000;

/** The session list is not paged yet, so the server caps it at the most recent sessions. */
export const CLAUDE_SESSION_LIST_LIMIT = 200;

export const SESSION_TITLE_MAX_CHARS = 60;
export const UNTITLED_SESSION_TITLE = "Untitled conversation";

export const MAX_SESSION_KIND_CHARS = 50;
export const MAX_NOTICE_CHARS = 2_000;

/** Size of one turn as JSON. Tool results are capped at 20k characters each, so this is generous. */
export const MAX_TURN_CHARS = 500_000;
