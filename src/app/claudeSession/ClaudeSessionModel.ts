import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type { ClaudeSessionDoc, ClaudeSessionTurnDoc } from "@/app/claudeSession/ClaudeSessionTypes";

const ClaudeSessionSchema = new Schema<ClaudeSessionDoc>(
  {
    sessionId: { type: String, required: true, unique: true },
    saId: { type: String, required: true },
    kind: { type: String, required: true },
    title: { type: String, required: true },
    turnCount: { type: Number, default: 0 },
    apiCalls: { type: Number, default: 0 },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    costUsd: { type: Number, default: 0 },
  },
  { timestamps: true },
);

ClaudeSessionSchema.index({ updatedAt: -1 });
// For when reading is narrowed to a user's own conversations.
ClaudeSessionSchema.index({ saId: 1, updatedAt: -1 });

export const ClaudeSessionModel = createModel<ClaudeSessionDoc>("ClaudeSession", ClaudeSessionSchema);

const ClaudeSessionTurnSchema = new Schema<ClaudeSessionTurnDoc>(
  {
    sessionId: { type: String, required: true },
    turnIndex: { type: Number, required: true },
    system: { type: String, default: "" },
    // Mixed on purpose: the messages are stored exactly as the API produced them.
    prompt: { type: Schema.Types.Mixed, required: true },
    replies: { type: Schema.Types.Mixed, default: () => [] },
    stats: { type: Schema.Types.Mixed, default: null },
    notice: { type: String, default: null },
  },
  // `minimize: false` keeps empty objects. Without it a tool call with no arguments loses its
  // `input: {}`, and a conversation recalled from storage is then rejected when it is resent.
  { timestamps: true, minimize: false },
);

ClaudeSessionTurnSchema.index({ sessionId: 1, turnIndex: 1 }, { unique: true });

export const ClaudeSessionTurnModel = createModel<ClaudeSessionTurnDoc>("ClaudeSessionTurn", ClaudeSessionTurnSchema);
