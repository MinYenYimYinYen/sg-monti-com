import type { AnthropicModelId } from "@/app/anthropic/anthropicConst";

/**
 * Every tunable number in the study module lives in this one object. It is hard coded for now. The
 * pure functions that use it take a `StudyConfig` as a parameter instead of importing the constant,
 * so it can later be replaced by live data (an admin screen, or a per-user setting) without
 * touching them.
 */
export type StudyConfig = {
  scheduling: {
    /** Minutes between tries while a new card is being learned. Answering "knew" advances a step; the last step graduates. */
    learningStepsMinutes: readonly number[];
    /** Same, for a card that lapsed. */
    relearningStepsMinutes: readonly number[];
    graduatingIntervalDays: number;
    startingEase: number;
    /** An ease below this makes intervals grow too slowly to be useful. */
    minimumEase: number;
    /** Added to the ease when the learner knew the card. Anki's "Good" leaves it unchanged, which is 0. */
    easeChangeOnKnew: number;
    /** Taken off the ease when the learner missed a review card. */
    easeLossOnMiss: number;
    /** Share of the old interval kept after a lapse. 0 restarts the card, as Anki does by default. */
    lapseIntervalMultiplier: number;
    minimumIntervalDays: number;
    maximumIntervalDays: number;
    /** ISO date of the test, or null. When set, no card is scheduled later than it. */
    examDate: string | null;
    /** Days before the exam by which every card should have come due at least once more. */
    examBufferDays: number;
  };
  dailyLimits: {
    newCardsPerDay: number;
    reviewsPerDay: number;
    /** The day a limit counts in. The business's own, whatever zone the server or the browser is in. */
    timeZone: string;
  };
  generation: {
    /** Quality over cost for a one-time import. Must be an allowed model in `anthropicConst.ts`. */
    model: AnthropicModelId;
    /** Pages a chunk starts with. A chunk over the byte limit is halved and tried again. */
    startingPagesPerChunk: number;
    /** Pages repeated at the start of the next chunk so a section that spans a boundary is not cut. */
    chunkOverlapPages: number;
    /** Raw PDF bytes. Base64 adds a third, and Vercel caps a request body at about 4.5 MB. */
    maxChunkBytes: number;
    /** Claude is told to over-propose and let the admin choose, so this only stops a runaway list. */
    maxImageProposalsPerChunk: number;
    /** Cards Claude may send in one `submitCards` call. It can call again for more. */
    maxCardsPerCall: number;
    /**
     * Thinking tokens count toward this. A server caller may go above the browser's 8,192, up to
     * `MAX_SERVER_TOKENS_CAP`, and must pass `timeoutMs`. Dense pages can need a long answer, but
     * a longer one also takes longer, so raising this may require raising `requestBudgetMs` too.
     */
    maxOutputTokens: number;
    /** Longest one model call may run. Opus writing many cards is slow. */
    callTimeoutMs: number;
    /**
     * Everything one `generateCards` request may spend, tool loop included. It must stay under the
     * route's `maxDuration` (a literal in `api/route.ts`, because Next reads it at build time),
     * leaving room to save the cards.
     */
    requestBudgetMs: number;
    /** A call is not started with less than this left. It would only time out. */
    minimumCallMs: number;
    /** A chunk stuck in "generating" this long is presumed dead, and may be claimed again. */
    staleClaimMs: number;
    /** A run stops after this many sections in a row fail, since the cause is likely shared (credit, key, rate limit). */
    stopAfterConsecutiveFailures: number;
    /** Refused before the file is read, so a huge upload cannot exhaust the browser's memory. */
    maxSourceFileBytes: number;
  };
  /** Validation caps on what Claude and the admin send. The server refuses anything over them. */
  limits: {
    deckTitleMaxChars: number;
    fileNameMaxChars: number;
    maxPagesPerImport: number;
    maxChunksPerImport: number;
    promptMaxChars: number;
    answerTextMaxChars: number;
    listMaxEntries: number;
    listEntryMaxChars: number;
    tableMaxColumns: number;
    tableMaxRows: number;
    noteMaxChars: number;
    sectionTitleMaxChars: number;
    sourceQuoteMaxChars: number;
    imageHintMaxChars: number;
    tagMaxCount: number;
    tagMaxChars: number;
    /** Cards one request may name, for publish, accept and delete. */
    maxCardKeysPerRequest: number;
    /** A stored picture's side. A card is read on a screen, so this is generous. */
    maxImageSidePx: number;
  };
  images: {
    /** Stored bytes, per image. */
    maxImageBytes: number;
    /** Where the squeeze starts. */
    targetWidthPx: number;
    /** The squeeze stops here. An image that still does not fit is not stored. */
    minimumWidthPx: number;
    /** Tried in order at each size, before the size is reduced. */
    jpegQualitySteps: readonly number[];
    /** Each size reduction multiplies the width by this. */
    shrinkFactor: number;
    /** A pasted or chosen file larger than this is refused before it is decoded. */
    maxSourceBytes: number;
    /** Shown on an image card when Claude did not suggest a question. */
    defaultPrompt: string;
  };
};

/** How long a deck or import list counts as fresh, so remounting a screen does not refetch. */
export const STUDY_STALE_MS = 5 * 60 * 1000;

export const STUDY_CONFIG: StudyConfig = {
  scheduling: {
    learningStepsMinutes: [1, 10],
    relearningStepsMinutes: [10],
    graduatingIntervalDays: 1,
    startingEase: 2.5,
    minimumEase: 1.3,
    easeChangeOnKnew: 0,
    easeLossOnMiss: 0.2,
    lapseIntervalMultiplier: 0,
    minimumIntervalDays: 1,
    maximumIntervalDays: 365,
    examDate: null,
    examBufferDays: 2,
  },
  dailyLimits: {
    newCardsPerDay: 20,
    reviewsPerDay: 200,
    timeZone: "America/Chicago",
  },
  generation: {
    model: "claude-opus-5-5",
    startingPagesPerChunk: 5,
    chunkOverlapPages: 1,
    // 3 MB becomes about 4 MB of base64, which leaves room for the rest of the body under the platform limit.
    maxChunkBytes: 3_000_000,
    maxImageProposalsPerChunk: 15,
    maxCardsPerCall: 25,
    maxOutputTokens: 24_000,
    callTimeoutMs: 250_000,
    requestBudgetMs: 280_000,
    minimumCallMs: 20_000,
    staleClaimMs: 6 * 60 * 1000,
    stopAfterConsecutiveFailures: 2,
    maxSourceFileBytes: 300 * 1024 * 1024,
  },
  limits: {
    deckTitleMaxChars: 100,
    fileNameMaxChars: 200,
    maxPagesPerImport: 3000,
    maxChunksPerImport: 1000,
    promptMaxChars: 300,
    answerTextMaxChars: 1500,
    listMaxEntries: 30,
    listEntryMaxChars: 400,
    tableMaxColumns: 8,
    tableMaxRows: 30,
    noteMaxChars: 600,
    sectionTitleMaxChars: 200,
    sourceQuoteMaxChars: 300,
    imageHintMaxChars: 300,
    tagMaxCount: 6,
    tagMaxChars: 40,
    maxCardKeysPerRequest: 500,
    maxImageSidePx: 4000,
  },
  images: {
    maxImageBytes: 250 * 1024,
    targetWidthPx: 1000,
    minimumWidthPx: 400,
    jpegQualitySteps: [0.8, 0.7, 0.6, 0.5],
    shrinkFactor: 0.85,
    maxSourceBytes: 20 * 1024 * 1024,
    defaultPrompt: "What does this image show?",
  },
};
