import type { AnthropicModelId } from "@/app/anthropic/anthropicConst";
import type { ConversationTotals } from "@/app/anthropic/AnthropicTypes";
import type { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// Person references (src/lib/mongoose/mongo.readme.md section 4), decided with the user: people are
// identified by `userName` throughout this module.
//   - Review state (`CardScheduleDoc`, `ReviewLogDoc`) only works with the login, so it is deleted
//     with the user. Both collections must be added to `deleteUserReferences`.
//   - `createdByUserName` and `importedByUserName` are authored shared content and history, so they
//     are kept on delete. This is the same drift the readme lists for QBO imports: new history
//     normally uses `saId`.

// ───────── Decks ─────────

/** One exam's worth of cards, such as "Category A". Decks are data because every new PDF can be a new deck. */
export type StudyDeckDoc = CreatedUpdated & {
  /** UUID minted by the server. */
  deckKey: string;
  title: string;
  /** The test the deck prepares for, so employees can find it by exam. */
  examName: string;
  createdByUserName: string;
};

// ───────── Cards ─────────

export type AnswerGroup = { label: string; points: string[] };

/**
 * The shape of an answer decides how it is shown and, later, how it can be graded.
 * `points` is unordered ("five examples of misuse"); `steps` is order-sensitive (STARR);
 * `groups` is a set of labeled lists (commercial, noncommercial and structural recordkeeping).
 */
export type CardAnswer =
  | { format: "text"; text: string }
  | { format: "points"; points: string[] }
  | { format: "steps"; steps: string[] }
  | { format: "groups"; groups: AnswerGroup[] }
  | { format: "table"; columns: string[]; rows: string[][] };

export type CardAnswerFormat = CardAnswer["format"];

/** An image card asks the learner to recognize what a picture shows. A text card has no picture. */
export type CardKind = "text" | "image";

/**
 * `proposed` exists only for image cards: Claude named an answer and the admin has not yet decided to
 * make a card of it. Accepting one makes it a `draft`. Only `published` cards reach students.
 */
export type CardStatus = "proposed" | "draft" | "published";

export type StudyCardDoc = CreatedUpdated & {
  /** UUID minted by the server. It never derives from the content, because content is edited and review history hangs on this key. */
  cardKey: string;
  deckKey: string;
  /** The import that produced the card, or null for a card written by hand. */
  importId: string | null;
  /** The chunk of that import, so a retried chunk can clear its own earlier drafts and nothing else. */
  importChunkIndex: number | null;
  kind: CardKind;
  status: CardStatus;
  /** The term, the objective, or the question an image card asks. */
  prompt: string;
  /** For an image card this is the thing the picture shows, such as "Atmospheric vacuum breaker". */
  answer: CardAnswer;
  /** Supporting detail that is not part of the answer, such as a worked example. */
  note: string | null;
  /** The chapter or section heading Claude found, as written in the source. */
  sectionTitle: string | null;
  /** Page of the uploaded PDF, so an admin can check an answer against the source. */
  sourcePage: number | null;
  /** A short verbatim quote from that page that supports the answer. */
  sourceQuote: string | null;
  tags: string[];
  sortOrder: number;
  /** What to look for or snip, shown while the card waits for its picture. Image cards only. */
  imageHint: string | null;
  /** The stored picture. Null until one is attached, and always null on a text card. */
  imageKey: string | null;
};

/** A card before it is saved: everything except the timestamps the database adds. */
export type NewStudyCard = Omit<StudyCardDoc, keyof CreatedUpdated>;

/** Hydration: what the UI needs beyond the stored card. */
export type StudyCardProps = {
  deck: StudyDeckDoc;
  /** Null when this user has never seen the card, which makes it a new card. */
  schedule: CardScheduleDoc | null;
};

/** The card as components consume it. */
export type StudyCard = StudyCardDoc & StudyCardProps;

// ───────── Images ─────────

/** What an op returns about a stored image. The bytes are fetched separately, one card at a time. */
export type StudyImageDoc = CreatedUpdated & {
  /** UUID minted by the server. */
  imageKey: string;
  deckKey: string;
  /** SHA-256 of the bytes, hex. Unique within a deck, so the same picture on several cards is stored once. */
  contentHash: string;
  mimeType: "image/jpeg";
  widthPx: number;
  heightPx: number;
  byteLength: number;
};

/** The shape the model stores. It never appears in a list payload. */
export type StudyImageStoredDoc = StudyImageDoc & { data: Buffer };

// ───────── Imports ─────────

export type ImportChunkStatus = "pending" | "generating" | "done" | "failed";

/** One slice of the uploaded PDF, sent to Claude on its own. Page numbers are 1-based and inclusive. */
export type ImportChunkDoc = {
  chunkIndex: number;
  /** The range sent to Claude. It starts with overlap pages from the previous chunk, when there are any. */
  firstPage: number;
  lastPage: number;
  /** The first page cards may come from. Pages before it are overlap, sent only for context. */
  ownFirstPage: number;
  status: ImportChunkStatus;
  /** When the current attempt began, so a request that died can be told from one still running. */
  startedAt: string | null;
  /** Plain-language reason, kept so the admin can decide whether to retry. */
  failureMessage: string | null;
  cardCount: number;
  proposalCount: number;
  usage: ConversationTotals;
};

/**
 * The plan and progress of splitting one PDF. If chunk 7 fails, only chunk 7 is retried. The file
 * itself is never stored: an admin re-selects it to resume.
 */
export type StudyImportDoc = CreatedUpdated & {
  /** UUID minted by the server. */
  importId: string;
  deckKey: string;
  fileName: string;
  pageCount: number;
  model: AnthropicModelId;
  chunks: ImportChunkDoc[];
  /** Pages too large to send even alone. They are in no section, so no card can come from them. */
  skippedPages: number[];
  importedByUserName: string;
};

// ───────── Review state ─────────

/** A card with no schedule document is "new". */
export type SchedulePhase = "learning" | "review" | "relearning";

/** The two choices a learner has, as in Anki without the Hard and Easy buttons. */
export type ReviewOutcome = "knew" | "missed";

/** Where one user stands on one card. A unique index on `{ userName, cardKey }`. */
export type CardScheduleDoc = CreatedUpdated & {
  userName: string;
  cardKey: string;
  /** Kept so progress by deck can be shown without loading every card. */
  deckKey: string;
  phase: SchedulePhase;
  /** Position in the learning or relearning steps. Only meaningful while in those phases. */
  stepIndex: number;
  dueAt: string;
  /** Zero while the card is still in its learning steps. */
  intervalDays: number;
  easeFactor: number;
  /** Consecutive successful reviews since the card last lapsed. */
  repetitions: number;
  lapses: number;
  lastReviewedAt: string;
};

/** Append-only history, one row per answer, so managers can see how an employee is preparing. */
export type ReviewLogDoc = {
  userName: string;
  cardKey: string;
  deckKey: string;
  reviewedAt: string;
  outcome: ReviewOutcome;
  phaseBefore: SchedulePhase | "new";
  intervalDaysBefore: number;
  intervalDaysAfter: number;
};

