import { Schema } from "mongoose";
import { createModel } from "@/lib/mongoose/createModel";
import type {
  CardScheduleDoc,
  ImportChunkDoc,
  ReviewLogDoc,
  StudyCardDoc,
  StudyDeckDoc,
  StudyImageStoredDoc,
  StudyImportDoc,
} from "@/app/study/StudyTypes";

// Types live in StudyTypes.ts. Which collections are deleted with a user, and which are kept, is
// recorded at the top of that file.

const StudyDeckSchema = new Schema<StudyDeckDoc>(
  {
    deckKey: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    examName: { type: String, required: true },
    createdByUserName: { type: String, required: true },
  },
  { timestamps: true },
);

export const StudyDeckModel = createModel<StudyDeckDoc>("StudyDeck", StudyDeckSchema);

const StudyCardSchema = new Schema<StudyCardDoc>(
  {
    cardKey: { type: String, required: true, unique: true },
    deckKey: { type: String, required: true },
    importId: { type: String, default: null },
    importChunkIndex: { type: Number, default: null },
    kind: { type: String, enum: ["text", "image"], required: true },
    status: { type: String, enum: ["proposed", "draft", "published"], required: true },
    prompt: { type: String, required: true },
    // Mixed on purpose: `CardAnswer` is a union of five shapes, and the route validates it with zod.
    answer: { type: Schema.Types.Mixed, required: true },
    note: { type: String, default: null },
    sectionTitle: { type: String, default: null },
    sourcePage: { type: Number, default: null },
    sourceQuote: { type: String, default: null },
    tags: { type: [String], default: () => [] },
    sortOrder: { type: Number, default: 0 },
    imageHint: { type: String, default: null },
    imageKey: { type: String, default: null },
  },
  // `minimize: false` keeps empty arrays and objects inside `answer` exactly as validated.
  { timestamps: true, minimize: false },
);

// A deck's cards by status, in reading order: the review screen and the student list.
StudyCardSchema.index({ deckKey: 1, status: 1, sortOrder: 1 });
StudyCardSchema.index({ importId: 1, importChunkIndex: 1 });
// Deleting a picture only when no other card still uses it.
StudyCardSchema.index({ imageKey: 1 });

export const StudyCardModel = createModel<StudyCardDoc>("StudyCard", StudyCardSchema);

const StudyImageSchema = new Schema<StudyImageStoredDoc>(
  {
    imageKey: { type: String, required: true, unique: true },
    deckKey: { type: String, required: true },
    contentHash: { type: String, required: true },
    mimeType: { type: String, enum: ["image/jpeg"], required: true },
    widthPx: { type: Number, required: true },
    heightPx: { type: Number, required: true },
    byteLength: { type: Number, required: true },
    data: { type: Buffer, required: true },
  },
  { timestamps: true },
);

// The same picture on several cards of one deck is stored once.
StudyImageSchema.index({ deckKey: 1, contentHash: 1 }, { unique: true });

export const StudyImageModel = createModel<StudyImageStoredDoc>("StudyImage", StudyImageSchema);

const ImportChunkSchema = new Schema<ImportChunkDoc>(
  {
    chunkIndex: { type: Number, required: true },
    firstPage: { type: Number, required: true },
    lastPage: { type: Number, required: true },
    ownFirstPage: { type: Number, required: true },
    status: { type: String, enum: ["pending", "generating", "done", "failed"], required: true },
    startedAt: { type: String, default: null },
    failureMessage: { type: String, default: null },
    cardCount: { type: Number, default: 0 },
    proposalCount: { type: Number, default: 0 },
    usage: {
      apiCalls: { type: Number, default: 0 },
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
      costUsd: { type: Number, default: 0 },
    },
  },
  { _id: false },
);

const StudyImportSchema = new Schema<StudyImportDoc>(
  {
    importId: { type: String, required: true, unique: true },
    deckKey: { type: String, required: true },
    fileName: { type: String, required: true },
    pageCount: { type: Number, required: true },
    model: { type: String, required: true },
    chunks: { type: [ImportChunkSchema], default: () => [] },
    skippedPages: { type: [Number], default: () => [] },
    importedByUserName: { type: String, required: true },
  },
  { timestamps: true },
);

StudyImportSchema.index({ deckKey: 1, createdAt: -1 });

export const StudyImportModel = createModel<StudyImportDoc>("StudyImport", StudyImportSchema);

// Deleted with the user: a schedule only means something to the person who is studying.
const CardScheduleSchema = new Schema<CardScheduleDoc>(
  {
    userName: { type: String, required: true },
    cardKey: { type: String, required: true },
    deckKey: { type: String, required: true },
    phase: { type: String, enum: ["learning", "review", "relearning"], required: true },
    stepIndex: { type: Number, default: 0 },
    dueAt: { type: String, required: true },
    intervalDays: { type: Number, default: 0 },
    easeFactor: { type: Number, required: true },
    repetitions: { type: Number, default: 0 },
    lapses: { type: Number, default: 0 },
    lastReviewedAt: { type: String, required: true },
  },
  { timestamps: true },
);

CardScheduleSchema.index({ userName: 1, cardKey: 1 }, { unique: true });
// What is due now, for one user in one deck.
CardScheduleSchema.index({ userName: 1, deckKey: 1, dueAt: 1 });

export const CardScheduleModel = createModel<CardScheduleDoc>("CardSchedule", CardScheduleSchema);

// Deleted with the user, as decided: review history is keyed by `userName`.
const ReviewLogSchema = new Schema<ReviewLogDoc>(
  {
    userName: { type: String, required: true },
    cardKey: { type: String, required: true },
    deckKey: { type: String, required: true },
    reviewedAt: { type: String, required: true },
    outcome: { type: String, enum: ["knew", "missed"], required: true },
    phaseBefore: { type: String, enum: ["new", "learning", "review", "relearning"], required: true },
    intervalDaysBefore: { type: Number, default: 0 },
    intervalDaysAfter: { type: Number, default: 0 },
  },
  // Append-only and carries its own `reviewedAt`, so no createdAt or updatedAt.
  { timestamps: false },
);

ReviewLogSchema.index({ userName: 1, reviewedAt: -1 });
ReviewLogSchema.index({ userName: 1, deckKey: 1, reviewedAt: -1 });
ReviewLogSchema.index({ cardKey: 1 });

export const ReviewLogModel = createModel<ReviewLogDoc>("ReviewLog", ReviewLogSchema);
