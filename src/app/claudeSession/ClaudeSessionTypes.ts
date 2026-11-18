import type { ChatTurn, ConversationTotals } from "@/app/anthropic/AnthropicTypes";
import type { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// Person reference: both docs record who held the conversation as `saId`. That is History
// (mongo.readme.md section 4), so it is kept when the user is deleted and is NOT in
// `deleteUserReferences`.

/**
 * One saved Claude conversation, without its turns. The totals are kept current by the server as
 * turns arrive, so a list of sessions never has to load the turns to show what each cost.
 */
export type ClaudeSessionDoc = CreatedUpdated &
  ConversationTotals & {
    /** Minted by the client when the conversation starts. */
    sessionId: string;
    saId: string;
    /** What started it, such as `askHarold`, so other features can share this module. */
    kind: string;
    /** Taken from the first prompt. */
    title: string;
    turnCount: number;
  };

/**
 * One prompt and everything that came back for it, exactly as `ChatTurn` holds it. Messages are
 * stored verbatim: thinking blocks must be resent to the API unmodified.
 */
export type ClaudeSessionTurnDoc = CreatedUpdated &
  ChatTurn & {
    sessionId: string;
    /** Zero-based and unique within the session. The order the turns are replayed in. */
    turnIndex: number;
    /** The system prompt this turn was sent with. It can differ per turn. */
    system: string;
  };

export type ClaudeSessionTurnInput = ChatTurn & { system: string };

export type AppendTurnParams = {
  sessionId: string;
  /** Only used when this turn creates the session. */
  kind: string;
  turn: ClaudeSessionTurnInput;
};

export type AppendTurnResult = {
  session: ClaudeSessionDoc;
  turn: ClaudeSessionTurnDoc;
};
