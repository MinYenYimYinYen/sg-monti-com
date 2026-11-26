import type {
  CardAnswer,
  CardScheduleDoc,
  ReviewLogDoc,
  ReviewOutcome,
  StudyCardDoc,
  StudyDeckDoc,
  StudyImportDoc,
} from "@/app/study/StudyTypes";

// Params and results of the study API. Kept apart from StudyTypes.ts, which holds what is stored.

export type CreateDeckParams = { title: string; examName: string };

/** One planned section of the PDF, as `planChunks` produced it. */
export type ChunkPlanInput = { firstPage: number; lastPage: number; ownFirstPage: number };

export type PlanImportParams = {
  deckKey: string;
  fileName: string;
  pageCount: number;
  chunks: ChunkPlanInput[];
  /** Pages the planner could not fit in any section. Stored so they are never silently dropped. */
  skippedPages: number[];
};

export type GenerateCardsParams = {
  importId: string;
  chunkIndex: number;
  /** The PDF section as base64, cut by the browser. Never stored. */
  pdfBase64: string;
};

export type GenerateCardsResult = {
  /** The import with this chunk's new status and cost. */
  studyImport: StudyImportDoc;
  textCardsAdded: number;
  imageProposalsAdded: number;
};

export type CreateDeckResult = StudyDeckDoc;

// ───────── Review screen (studyCardAdmin) ─────────

export type GetCardsParams = { deckKey: string };

/** The fields an admin may change. A card's kind, status, key and source never change this way. */
export type CardEdit = {
  prompt: string;
  answer: CardAnswer;
  note: string | null;
  tags: string[];
  imageHint: string | null;
};

export type EditCardParams = { cardKey: string; edit: CardEdit };

export type CardKeysParams = { cardKeys: string[] };

/** Why a card was not changed, so the screen can say so instead of seeming to ignore the click. */
export type CardRefusal = { cardKey: string; reason: string };

export type CardChangeResult = {
  /** The cards as they are now. */
  cards: StudyCardDoc[];
  refused: CardRefusal[];
};

export type DeleteCardsResult = { deletedCardKeys: string[]; refused: CardRefusal[] };

export type AttachFigureParams = {
  cardKey: string;
  /** JPEG bytes as base64, already shrunk by the browser. The server checks everything again. */
  dataBase64: string;
  widthPx: number;
  heightPx: number;
};

export type AttachFigureResult = { card: StudyCardDoc };

export type RemoveFigureParams = { cardKey: string };

export type GetFigureParams = { imageKey: string };

/** One stored picture, ready to use as an image source. */
export type FigureResult = { imageKey: string; dataUrl: string };

// ───────── Study screen (studyCardStudent) ─────────

export type GetPublishedCardsParams = { deckKey: string };

export type StudyDeckSummary = { deck: StudyDeckDoc; publishedCardCount: number };

export type SubmitReviewParams = { cardKey: string; outcome: ReviewOutcome };

export type SubmitReviewResult = { schedule: CardScheduleDoc; reviewLog: ReviewLogDoc };

export type GetMyReviewsParams = { deckKey: string };

export type MyReviews = {
  schedules: CardScheduleDoc[];
  /** Only the recent days: enough to count today's limit, not the whole history. */
  recentReviewLogs: Pick<ReviewLogDoc, "cardKey" | "reviewedAt" | "phaseBefore">[];
};
