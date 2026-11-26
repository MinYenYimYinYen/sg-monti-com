import type { StudyConfig } from "@/app/study/studyConst";

// Plans how an uploaded PDF is cut into pieces small enough to send to Claude one at a time. Pure:
// the size of a candidate piece is measured by an injected function, so the real cutting (pdf-lib,
// in the browser) and a fake in a test both plug in. Page numbers are 1-based and inclusive.

export type PageRange = { firstPage: number; lastPage: number };

export type PlannedChunk = PageRange & {
  chunkIndex: number;
  /** The first page cards may come from. Pages before it are overlap, sent only for context. */
  ownFirstPage: number;
  /** What the measurer reported for the range, so the caller can show it without cutting again. */
  bytes: number;
};

export type ChunkPlan = {
  chunks: PlannedChunk[];
  /** Pages too large to send even alone. They are in no chunk, so the admin must handle them. */
  oversizedPages: number[];
};

type GenerationConfig = StudyConfig["generation"];

type MeasureBytes = (range: PageRange) => Promise<number>;

type FittedChunk = PageRange & { ownFirstPage: number; bytes: number };

/**
 * Finds the largest chunk starting at `ownFirstPage` that fits, trying `startingPagesPerChunk` pages
 * and halving until it does. A single page that is still too large is tried again without its overlap
 * page, since the overlap may be what pushed it over. Returns null when even that does not fit.
 */
async function fitChunk({
  ownFirstPage,
  pageCount,
  previousPageWasOversized,
  config,
  measureBytes,
}: {
  ownFirstPage: number;
  pageCount: number;
  previousPageWasOversized: boolean;
  config: GenerationConfig;
  measureBytes: MeasureBytes;
}): Promise<FittedChunk | null> {
  // An oversized page is in no chunk, and repeating it as overlap would make every attempt too big.
  const overlapPages = previousPageWasOversized ? 0 : Math.min(config.chunkOverlapPages, ownFirstPage - 1);
  let ownPages = Math.max(1, Math.min(config.startingPagesPerChunk, pageCount - ownFirstPage + 1));

  while (ownPages >= 1) {
    const lastPage = ownFirstPage + ownPages - 1;
    const withOverlap = { firstPage: ownFirstPage - overlapPages, lastPage };
    const bytes = await measureBytes(withOverlap);
    if (bytes <= config.maxChunkBytes) return { ...withOverlap, ownFirstPage, bytes };

    if (ownPages === 1) {
      if (overlapPages === 0) return null;
      const withoutOverlap = { firstPage: ownFirstPage, lastPage };
      const bytesWithoutOverlap = await measureBytes(withoutOverlap);
      if (bytesWithoutOverlap <= config.maxChunkBytes) {
        return { ...withoutOverlap, ownFirstPage, bytes: bytesWithoutOverlap };
      }
      return null;
    }
    ownPages = Math.floor(ownPages / 2);
  }
  return null;
}

/**
 * Walks the document from the first page, fitting one chunk after another. Each chunk starts again
 * from `startingPagesPerChunk`, because a dense page does not mean the next one is. Every page ends
 * up in exactly one chunk's own pages, or in `oversizedPages`.
 */
export async function planChunks({
  pageCount,
  config,
  measureBytes,
}: {
  pageCount: number;
  config: GenerationConfig;
  measureBytes: MeasureBytes;
}): Promise<ChunkPlan> {
  const chunks: PlannedChunk[] = [];
  const oversizedPages: number[] = [];
  let nextPage = 1;

  while (nextPage <= pageCount) {
    const fitted = await fitChunk({
      ownFirstPage: nextPage,
      pageCount,
      previousPageWasOversized: oversizedPages.includes(nextPage - 1),
      config,
      measureBytes,
    });
    if (fitted === null) {
      oversizedPages.push(nextPage);
      nextPage += 1;
      continue;
    }
    chunks.push({ ...fitted, chunkIndex: chunks.length });
    nextPage = fitted.lastPage + 1;
  }

  return { chunks, oversizedPages };
}
