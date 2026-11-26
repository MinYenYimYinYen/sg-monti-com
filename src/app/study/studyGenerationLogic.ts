import type { ChunkPlanInput } from "@/app/study/StudyApiTypes";
import type { NewStudyCard } from "@/app/study/StudyTypes";
import type { SubmitCardsInput } from "@/app/study/studyCardSchema";

// Pure: turns what Claude submitted into card documents, and checks a plan from the browser. No
// database, no network, no clock. Keys are minted by an injected function so a test can fix them.

/** Cards sort by the page they came from, then by position, so reading order holds across chunks and calls. */
export const SORT_ORDER_PAGE_STRIDE = 1000;

export function normalizeForMatch(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export type BuiltCards = {
  cards: NewStudyCard[];
  /** Left out because the same prompt was already submitted in this run. */
  duplicates: number;
  /** Every prompt seen so far, to pass to the next call. */
  seenKeys: Set<string>;
};

/**
 * Text cards come out as drafts and image proposals as proposals, so nothing reaches a student
 * before an admin decides. A repeated prompt is dropped and counted so Claude can be told.
 * `chunk.firstPage` is the document page of the chunk's page 1, which turns the pages Claude cites
 * back into the uploaded file's own page numbers.
 */
export function buildNewStudyCards({
  input,
  chunk,
  deckKey,
  importId,
  sortOrderStart,
  seenKeys,
  newKey,
  defaultImagePrompt,
}: {
  input: SubmitCardsInput;
  chunk: { firstPage: number; chunkIndex: number };
  deckKey: string;
  importId: string;
  /** Where this call's first card sits among the import's cards, so reading order survives several calls. */
  sortOrderStart: number;
  seenKeys: ReadonlySet<string>;
  newKey: () => string;
  defaultImagePrompt: string;
}): BuiltCards {
  const nextSeenKeys = new Set(seenKeys);
  const cards: NewStudyCard[] = [];
  let duplicates = 0;

  const toDocumentPage = (chunkPage: number) => chunk.firstPage + chunkPage - 1;
  const shared = { deckKey, importId, importChunkIndex: chunk.chunkIndex };

  function isNew(matchKey: string): boolean {
    if (nextSeenKeys.has(matchKey)) {
      duplicates += 1;
      return false;
    }
    nextSeenKeys.add(matchKey);
    return true;
  }

  for (const card of input.cards) {
    if (!isNew(`text:${normalizeForMatch(card.prompt)}`)) continue;
    cards.push({
      ...shared,
      cardKey: newKey(),
      kind: "text",
      status: "draft",
      prompt: card.prompt,
      answer: card.answer,
      note: card.note ?? null,
      sectionTitle: card.sectionTitle ?? null,
      sourcePage: toDocumentPage(card.chunkPage),
      sourceQuote: card.sourceQuote,
      tags: card.tags ?? [],
      sortOrder: sortOrderStart + cards.length,
      imageHint: null,
      imageKey: null,
    });
  }

  for (const proposal of input.imageProposals) {
    // The prompt is often the shared default, so what the picture shows is what tells proposals apart.
    if (!isNew(`image:${normalizeForMatch(proposal.answer)}`)) continue;
    cards.push({
      ...shared,
      cardKey: newKey(),
      kind: "image",
      status: "proposed",
      prompt: proposal.suggestedPrompt ?? defaultImagePrompt,
      answer: { format: "text", text: proposal.answer },
      note: null,
      sectionTitle: null,
      sourcePage: toDocumentPage(proposal.chunkPage),
      sourceQuote: null,
      tags: [],
      sortOrder: sortOrderStart + cards.length,
      imageHint: proposal.imageHint,
      imageKey: null,
    });
  }

  return { cards, duplicates, seenKeys: nextSeenKeys };
}

/** What the tool tells Claude after a successful submit. */
export function describeSubmitResult({ saved, duplicates }: { saved: number; duplicates: number }): string {
  if (duplicates === 0) return `Accepted ${saved} items.`;
  return `Accepted ${saved} items. ${duplicates} repeated an earlier prompt and were left out.`;
}

/** Why a plan cannot be used, or null. The server never trusts the browser's arithmetic. */
export function validateChunkPlan({
  pageCount,
  chunks,
  maxChunks,
}: {
  pageCount: number;
  chunks: ChunkPlanInput[];
  maxChunks: number;
}): string | null {
  if (chunks.length === 0) return "The plan has no sections.";
  if (chunks.length > maxChunks) return `The plan has too many sections (${maxChunks} at most).`;

  let previousLastPage = 0;
  for (const [index, chunk] of chunks.entries()) {
    const label = `Section ${index + 1}`;
    const isWhole = [chunk.firstPage, chunk.lastPage, chunk.ownFirstPage].every(Number.isInteger);
    if (!isWhole) return `${label} has a page number that is not a whole number.`;
    if (chunk.firstPage < 1 || chunk.lastPage > pageCount) return `${label} is outside the ${pageCount} page document.`;
    if (chunk.firstPage > chunk.ownFirstPage || chunk.ownFirstPage > chunk.lastPage) {
      return `${label} has page numbers out of order.`;
    }
    if (chunk.ownFirstPage <= previousLastPage) {
      return `${label} makes cards from pages an earlier section already covers.`;
    }
    previousLastPage = chunk.lastPage;
  }
  return null;
}
