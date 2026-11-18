import { createSlice } from "@reduxjs/toolkit";
import { createStandardThunk } from "@/store/reduxUtil/thunkFactories";
import type { AppState } from "@/store";
import type { ClaudeSessionContract } from "@/app/claudeSession/api/ClaudeSessionContract";
import type { ClaudeSessionDoc, ClaudeSessionTurnDoc } from "@/app/claudeSession/ClaudeSessionTypes";
import { hasLoadedAllTurns, mergeTurnDocs, upsertSessionDoc } from "@/app/claudeSession/claudeSessionLogic";

type ClaudeSessionState = {
  sessionDocs: ClaudeSessionDoc[];
  turnDocs: ClaudeSessionTurnDoc[];
};

const initialState: ClaudeSessionState = {
  sessionDocs: [],
  turnDocs: [],
};

const API_PATH = "/claudeSession/api";

export const getSessions = createStandardThunk<ClaudeSessionContract, "getSessions">({
  typePrefix: "claudeSession/getSessions",
  apiPath: API_PATH,
  opName: "getSessions",
});

export const getTurns = createStandardThunk<ClaudeSessionContract, "getTurns">({
  typePrefix: "claudeSession/getTurns",
  apiPath: API_PATH,
  opName: "getTurns",
  // A session whose turns are all in state (including one being held live) is never fetched again.
  customCondition: (arg, { getState }) => {
    const { sessionDocs, turnDocs } = (getState() as AppState).claudeSession;
    return !hasLoadedAllTurns({ sessionDocs, turnDocs, sessionId: arg.params.sessionId });
  },
});

export const appendTurn = createStandardThunk<ClaudeSessionContract, "appendTurn">({
  typePrefix: "claudeSession/appendTurn",
  apiPath: API_PATH,
  opName: "appendTurn",
});

export const removeSession = createStandardThunk<ClaudeSessionContract, "removeSession">({
  typePrefix: "claudeSession/removeSession",
  apiPath: API_PATH,
  opName: "removeSession",
});

const claudeSessionSlice = createSlice({
  name: "claudeSession",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(getSessions.fulfilled, (state, action) => {
      state.sessionDocs = action.payload;
    });
    builder.addCase(getTurns.fulfilled, (state, action) => {
      state.turnDocs = mergeTurnDocs({ existing: state.turnDocs, incoming: action.payload });
    });
    builder.addCase(appendTurn.fulfilled, (state, action) => {
      const { session, turn } = action.payload;
      state.sessionDocs = upsertSessionDoc({ sessionDocs: state.sessionDocs, updated: session });
      state.turnDocs = mergeTurnDocs({ existing: state.turnDocs, incoming: [turn] });
    });
    builder.addCase(removeSession.fulfilled, (state, action) => {
      const { sessionId } = action.meta.arg.params;
      state.sessionDocs = state.sessionDocs.filter((doc) => doc.sessionId !== sessionId);
      state.turnDocs = state.turnDocs.filter((doc) => doc.sessionId !== sessionId);
    });
  },
});

export const claudeSessionActions = {
  ...claudeSessionSlice.actions,
  getSessions,
  getTurns,
  appendTurn,
  removeSession,
};

export const claudeSessionReducer = claudeSessionSlice.reducer;
