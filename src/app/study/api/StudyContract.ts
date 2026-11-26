import { ApiContract } from "@/lib/api/types/ApiContract";
import { DataResponse } from "@/lib/api/types/responses";
import type {
  AttachFigureParams,
  AttachFigureResult,
  CardChangeResult,
  CardKeysParams,
  CreateDeckParams,
  CreateDeckResult,
  DeleteCardsResult,
  EditCardParams,
  GenerateCardsParams,
  GenerateCardsResult,
  GetCardsParams,
  GetFigureParams,
  FigureResult,
  GetMyReviewsParams,
  GetPublishedCardsParams,
  MyReviews,
  PlanImportParams,
  RemoveFigureParams,
  StudyDeckSummary,
  SubmitReviewParams,
  SubmitReviewResult,
} from "@/app/study/StudyApiTypes";
import type { StudyCardDoc, StudyDeckDoc, StudyImportDoc } from "@/app/study/StudyTypes";

// Two audiences, and two capabilities that never imply each other. Every op is gated by exactly one:
// `studyCardAdmin` for authoring and `studyCardStudent` for studying. An admin who also studies holds both.
export interface StudyContract extends ApiContract {
  // ───────── studyCardAdmin: decks and imports ─────────
  getDecks: {
    params: Record<string, never>;
    result: DataResponse<StudyDeckDoc[]>;
  };
  /** One deck's imports, newest first, so a screen can offer to resume one. */
  getImports: {
    params: { deckKey: string };
    result: DataResponse<StudyImportDoc[]>;
  };
  createDeck: {
    params: CreateDeckParams;
    result: DataResponse<CreateDeckResult>;
  };
  /** Records how a PDF was split. Nothing is sent to Claude yet, and the file itself is never stored. */
  planImport: {
    params: PlanImportParams;
    result: DataResponse<StudyImportDoc>;
  };
  /**
   * Sends one planned section to Claude and saves its cards as drafts. A failed section is still a
   * success response: the import comes back with that section marked failed and what it cost.
   */
  generateCards: {
    params: GenerateCardsParams;
    result: DataResponse<GenerateCardsResult>;
  };

  // ───────── studyCardAdmin: reviewing cards ─────────
  /** Every card of a deck in every status, so the review screen can show drafts and picture ideas. */
  getCards: {
    params: GetCardsParams;
    result: DataResponse<StudyCardDoc[]>;
  };
  editCard: {
    params: EditCardParams;
    result: DataResponse<StudyCardDoc>;
  };
  /** Turns picture ideas into cards that wait for a picture. */
  acceptImageIdeas: {
    params: CardKeysParams;
    result: DataResponse<CardChangeResult>;
  };
  publishCards: {
    params: CardKeysParams;
    result: DataResponse<CardChangeResult>;
  };
  /** Takes published cards back to drafts so they can be corrected. Students stop seeing them at once. */
  unpublishCards: {
    params: CardKeysParams;
    result: DataResponse<CardChangeResult>;
  };
  /** Drafts and picture ideas only. A published card must be taken back to a draft first. */
  deleteCards: {
    params: CardKeysParams;
    result: DataResponse<DeleteCardsResult>;
  };
  attachFigure: {
    params: AttachFigureParams;
    result: DataResponse<AttachFigureResult>;
  };
  removeFigure: {
    params: RemoveFigureParams;
    result: DataResponse<AttachFigureResult>;
  };
  /** A picture of any card, drafts included. */
  getDraftFigure: {
    params: GetFigureParams;
    result: DataResponse<FigureResult>;
  };

  // ───────── studyCardStudent: studying ─────────
  /** Decks that have published cards, with how many. */
  getStudyDecks: {
    params: Record<string, never>;
    result: DataResponse<StudyDeckSummary[]>;
  };
  /** Published cards only. */
  getPublishedCards: {
    params: GetPublishedCardsParams;
    result: DataResponse<StudyCardDoc[]>;
  };
  /** The caller's own schedules, and enough recent log to count today's limit. */
  getMyReviews: {
    params: GetMyReviewsParams;
    result: DataResponse<MyReviews>;
  };
  submitReview: {
    params: SubmitReviewParams;
    result: DataResponse<SubmitReviewResult>;
  };
  /** A picture, only while a published card uses it. */
  getPublishedFigure: {
    params: GetFigureParams;
    result: DataResponse<FigureResult>;
  };
}
