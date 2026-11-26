import { randomUUID } from "node:crypto";
import { defineTool } from "@/app/anthropic/anthropicTools";
import type { AnthropicTool } from "@/app/anthropic/AnthropicTypes";
import type { NewStudyCard, StudyImportDoc } from "@/app/study/StudyTypes";
import { buildSubmitCardsSchema } from "@/app/study/studyCardSchema";
import type { StudyConfig } from "@/app/study/studyConst";
import { buildNewStudyCards, describeSubmitResult, SORT_ORDER_PAGE_STRIDE } from "@/app/study/studyGenerationLogic";
import { findInvalidChunkPages, SUBMIT_CARDS_TOOL_NAME, type ChunkSpan } from "@/app/study/studyPrompts";

// Server only. The `submitCards` tool Claude calls, plus the collector it fills. The tool saves
// nothing: it validates and gathers, and the caller saves only what a run that finished returns.

type ImportChunk = StudyImportDoc["chunks"][number];

export type CollectedCards = {
  cards: NewStudyCard[];
  seenKeys: Set<string>;
  submissions: number;
};

export function createSubmitCardsTool({
  chunk,
  span,
  deckKey,
  importId,
  config,
}: {
  chunk: ImportChunk;
  span: ChunkSpan;
  deckKey: string;
  importId: string;
  config: StudyConfig;
}): { tool: AnthropicTool; collected: CollectedCards } {
  const { generation, limits, images } = config;
  // Local to one request. The tool mutates it as Claude submits.
  const collected: CollectedCards = { cards: [], seenKeys: new Set<string>(), submissions: 0 };

  const tool = defineTool({
    name: SUBMIT_CARDS_TOOL_NAME,
    description:
      "Saves flash cards and image proposals made from the attached pages. It can be called more than once. Nothing is saved if it returns an error, so fix what it names and submit again.",
    input: buildSubmitCardsSchema({ limits, generation }),
    run: (input) => {
      const pageProblem = findInvalidChunkPages({ input, span });
      if (pageProblem !== null) throw new Error(pageProblem);

      const built = buildNewStudyCards({
        input,
        chunk,
        deckKey,
        importId,
        sortOrderStart: chunk.ownFirstPage * SORT_ORDER_PAGE_STRIDE + collected.cards.length,
        seenKeys: collected.seenKeys,
        newKey: randomUUID,
        defaultImagePrompt: images.defaultPrompt,
      });

      const proposalCount = [...collected.cards, ...built.cards].filter((card) => card.kind === "image").length;
      if (proposalCount > generation.maxImageProposalsPerChunk) {
        throw new Error(
          `That makes ${proposalCount} image proposals. The limit for these pages is ${generation.maxImageProposalsPerChunk}. Submit fewer. Nothing was saved.`,
        );
      }

      collected.cards.push(...built.cards);
      collected.seenKeys = built.seenKeys;
      collected.submissions += 1;
      return describeSubmitResult({ saved: built.cards.length, duplicates: built.duplicates });
    },
  });

  return { tool, collected };
}
