import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ChatTurn } from "@/app/anthropic/AnthropicTypes";

/**
 * The live conversation. `claudeSession` holds the saved copy; this is the one being worked on, so a
 * failed save never loses it. `currentTopicKeys` is the whole answer to "which documents apply": a
 * document applies when all of its tags are in it, and the selectors work that out.
 */
type AskAwayState = {
  /** Minted on the first prompt, by the thunk, because a reducer must not generate ids. */
  sessionId: string | null;
  turns: ChatTurn[];
  /** In the order they were marked. An array because Redux state must be serializable. */
  currentTopicKeys: string[];
  /** The prompt being answered, or null when idle. */
  pendingText: string | null;
};

const initialState: AskAwayState = {
  sessionId: null,
  turns: [],
  currentTopicKeys: [],
  pendingText: null,
};

const askAwaySlice = createSlice({
  name: "askAway",
  initialState,
  reducers: {
    sessionStarted(state, action: PayloadAction<string>) {
      state.sessionId = action.payload;
    },
    promptSent(state, action: PayloadAction<string>) {
      state.pendingText = action.payload;
    },
    /** Dispatched by the tool while Claude is still working, so the documents panel fills in live. */
    topicsMarked(state, action: PayloadAction<string[]>) {
      for (const topicKey of action.payload) {
        if (!state.currentTopicKeys.includes(topicKey)) state.currentTopicKeys.push(topicKey);
      }
    },
    /**
     * Ends a prompt. The topic list is replaced, not added to: a turn that failed part way is trimmed
     * out of the history, and the topics it marked must go with it. `turn` is null when the run threw
     * before producing anything.
     */
    turnFinished(state, action: PayloadAction<{ turn: ChatTurn | null; currentTopicKeys: string[] }>) {
      const { turn, currentTopicKeys } = action.payload;
      if (turn !== null) state.turns.push(turn);
      state.currentTopicKeys = currentTopicKeys;
      state.pendingText = null;
    },
    conversationCleared() {
      return initialState;
    },
  },
});

export const askAwayActions = askAwaySlice.actions;
export const askAwayReducer = askAwaySlice.reducer;
