import { sumUsage } from "@/app/anthropic/anthropicLogic";
import { computeTotalCost } from "@/app/anthropic/anthropicPricing";
import { checkSendMessageParams } from "@/app/anthropic/anthropicRequest";
import { sendToAnthropic } from "@/app/anthropic/anthropicServer";
import { runToolLoop } from "@/app/anthropic/anthropicToolLoop";
import type { ChatMessage, SendMessageParams } from "@/app/anthropic/AnthropicTypes";
import { AppError } from "@/lib/errors/AppError";
import { createSubmitCardsTool } from "@/app/study/_lib/submitCardsTool";
import { StudyCardModel } from "@/app/study/StudyModels";
import type { NewStudyCard, StudyImportDoc } from "@/app/study/StudyTypes";
import type { StudyConfig } from "@/app/study/studyConst";
import { buildChunkSpan, buildGenerationSystemPrompt, buildGenerationUserText } from "@/app/study/studyPrompts";

// Server only. Runs one PDF chunk through Claude and returns the cards to save. Generating writes
// nothing, so a failed run leaves no half-saved chunk: the caller saves only what a finished run returns.

type ImportChunk = StudyImportDoc["chunks"][number];

export type GeneratedChunk = {
  cards: NewStudyCard[];
  usage: ImportChunk["usage"];
  /** Set when the run did not finish. The cards are then discarded. */
  failureMessage: string | null;
};

function describeFailure(e: unknown): string {
  if (e instanceof AppError) return e.message;
  console.error("[study] generation failed unexpectedly", e);
  return "Something unexpected went wrong while reading these pages.";
}

export async function generateChunkCards({
  chunk,
  deckKey,
  deckTitle,
  importId,
  fileName,
  pdfBase64,
  config,
}: {
  chunk: ImportChunk;
  deckKey: string;
  deckTitle: string;
  importId: string;
  fileName: string;
  pdfBase64: string;
  config: StudyConfig;
}): Promise<GeneratedChunk> {
  const { generation } = config;
  const span = buildChunkSpan(chunk);
  const deadline = Date.now() + generation.requestBudgetMs;
  const { tool, collected } = createSubmitCardsTool({ chunk, span, deckKey, importId, config });

  const userMessage: ChatMessage = {
    role: "user",
    content: [
      { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 }, title: fileName },
      { type: "text", text: buildGenerationUserText({ fileName, deckTitle, span }) },
    ],
  };

  // The whole request shares one time budget. Each call gets what is left, and no call is started
  // that could not finish, since the route's own limit would kill the request and lose the cost.
  async function send(callParams: SendMessageParams) {
    const remainingMs = deadline - Date.now();
    if (remainingMs < generation.minimumCallMs) {
      throw new AppError({
        message: "Ran out of time on these pages. Try this section again.",
        type: "EXTERNAL_ERROR",
        statusCode: 504,
      });
    }
    const checked = checkSendMessageParams(callParams);
    if (!checked.ok) throw new AppError({ message: checked.message, type: "VALIDATION_ERROR", statusCode: 400 });
    return sendToAnthropic({ ...callParams, timeoutMs: Math.min(generation.callTimeoutMs, remainingMs) });
  }

  const loop = await runToolLoop({
    send,
    params: {
      model: generation.model,
      system: buildGenerationSystemPrompt(),
      messages: [userMessage],
      maxTokens: generation.maxOutputTokens,
    },
    tools: [tool],
  });

  const tokens = sumUsage(loop.usagePerCall);
  const usage = {
    apiCalls: loop.usagePerCall.length,
    inputTokens: tokens.inputTokens,
    outputTokens: tokens.outputTokens,
    costUsd: computeTotalCost({ model: generation.model, usagePerCall: loop.usagePerCall }),
  };

  if (loop.error !== null) return { cards: [], usage, failureMessage: describeFailure(loop.error) };
  if (collected.submissions === 0) {
    const reason =
      loop.stopReason === "max_tokens"
        ? "The answer ran out of room before any cards were submitted, even at the longest allowed length. Try this section again; if it keeps happening these pages are unusually dense."
        : "Claude did not submit any cards for these pages. Try this section again.";
    return { cards: [], usage, failureMessage: reason };
  }
  return { cards: collected.cards, usage, failureMessage: null };
}

/** Saves a finished run's cards in one insert, so a chunk is all in or all out. */
export async function saveGeneratedCards(cards: NewStudyCard[]): Promise<void> {
  if (cards.length > 0) await StudyCardModel.insertMany(cards);
}
