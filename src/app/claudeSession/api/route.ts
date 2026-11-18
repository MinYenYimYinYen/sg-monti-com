import { headers } from "next/headers";
import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";
import { CLAUDE_SESSION_LIST_LIMIT } from "@/app/claudeSession/claudeSessionConst";
import { buildSessionTitle, buildTotalsIncrement, isDuplicateKeyError } from "@/app/claudeSession/claudeSessionLogic";
import { parseAppendTurnParams } from "@/app/claudeSession/claudeSessionSchema";
import { ClaudeSessionModel, ClaudeSessionTurnModel } from "@/app/claudeSession/ClaudeSessionModel";
import type { ClaudeSessionContract } from "@/app/claudeSession/api/ClaudeSessionContract";

/** Reads the current user's saId from the proxy-injected header. */
async function getCurrentUserSaId(): Promise<string> {
  const headerStore = await headers();
  const saId = headerStore.get("x-user-id");
  if (!saId) {
    throw new AppError({ message: "Authentication required", type: "AUTH_ERROR", statusCode: 401 });
  }
  return saId;
}

function notYourSessionError(): AppError {
  return new AppError({
    message: "This conversation belongs to someone else.",
    type: "AUTH_ERROR",
    statusCode: 403,
  });
}

const handlers: HandlerMap<ClaudeSessionContract> = {
  // `read` sees every user's sessions. Narrowing it to the caller's own is a later change and
  // would filter these two handlers by saId (the `saId` index is already there for it).
  getSessions: {
    capability: can.claudeRequests.read,
    handler: async () => {
      await connectToMongoDB();
      const docs = await ClaudeSessionModel.find().sort({ updatedAt: -1 }).limit(CLAUDE_SESSION_LIST_LIMIT).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  getTurns: {
    capability: can.claudeRequests.read,
    handler: async ({ sessionId }) => {
      await connectToMongoDB();
      const docs = await ClaudeSessionTurnModel.find({ sessionId }).sort({ turnIndex: 1 }).lean();
      return { success: true, payload: cleanMongoArray(docs) };
    },
  },

  appendTurn: {
    // Having a conversation. Saving it is part of that, and it only ever touches the caller's own session.
    capability: can.claudeRequests.write,
    handler: async (rawParams) => {
      const parsed = parseAppendTurnParams(rawParams);
      if (!parsed.ok) {
        throw new AppError({ message: parsed.message, type: "VALIDATION_ERROR", statusCode: 400 });
      }
      const { sessionId, kind, turn } = parsed.params;
      const saId = await getCurrentUserSaId();
      const { system, ...chatTurn } = turn;
      const increment = buildTotalsIncrement(chatTurn.stats);

      await connectToMongoDB();

      // One atomic step: matching on saId as well means a session id held by another user cannot
      // match, so the upsert tries to insert it and hits the unique index instead of being hijacked.
      let sessionDoc;
      try {
        sessionDoc = await ClaudeSessionModel.findOneAndUpdate(
          { sessionId, saId },
          {
            $inc: { turnCount: 1, ...increment },
            $setOnInsert: { kind, title: buildSessionTitle(chatTurn.prompt) },
          },
          { upsert: true, new: true },
        ).lean();
      } catch (e) {
        if (isDuplicateKeyError(e)) throw notYourSessionError();
        throw e;
      }

      // The counter is the index source, so two turns arriving together get different indexes.
      const turnIndex = sessionDoc!.turnCount - 1;
      try {
        const turnDoc = await ClaudeSessionTurnModel.create({ sessionId, turnIndex, system, ...chatTurn });
        return {
          success: true,
          payload: {
            session: cleanMongoObject(sessionDoc!),
            turn: cleanMongoObject(turnDoc.toObject()),
          },
        };
      } catch (e) {
        // Undo the counters so a failed save does not leave the totals counting a turn that is not there.
        await ClaudeSessionModel.updateOne(
          { sessionId, saId },
          {
            $inc: {
              turnCount: -1,
              apiCalls: -increment.apiCalls,
              inputTokens: -increment.inputTokens,
              outputTokens: -increment.outputTokens,
              costUsd: -increment.costUsd,
            },
          },
        );
        throw e;
      }
    },
  },

  removeSession: {
    capability: can.claudeRequests.delete,
    handler: async ({ sessionId }) => {
      await connectToMongoDB();
      // The session goes first: orphaned turns are invisible, a session missing its turns is not.
      await ClaudeSessionModel.deleteOne({ sessionId });
      await ClaudeSessionTurnModel.deleteMany({ sessionId });
      return { success: true, payload: true };
    },
  },
};

export const POST = createRpcHandler(handlers);
