import { z } from "zod";
import type { StudyConfig } from "@/app/study/studyConst";
import { measureBase64Bytes } from "@/app/anthropic/anthropicRequest";
import type {
  AttachFigureParams,
  CardKeysParams,
  CreateDeckParams,
  EditCardParams,
  GenerateCardsParams,
  GetFigureParams,
  PlanImportParams,
  RemoveFigureParams,
  SubmitReviewParams,
} from "@/app/study/StudyApiTypes";
import { buildCardAnswerSchema } from "@/app/study/studyCardSchema";
import { validateChunkPlan } from "@/app/study/studyGenerationLogic";

// The route trusts nothing in the body. Each parser returns a plain message for the user, which the
// route throws as a validation error.

export type Parsed<T> = { ok: true; params: T } | { ok: false; message: string };

function fail(error: z.ZodError): { ok: false; message: string } {
  return { ok: false, message: `Invalid request. ${z.prettifyError(error)}` };
}

export function parseCreateDeckParams({ raw, config }: { raw: unknown; config: StudyConfig }): Parsed<CreateDeckParams> {
  const schema = z.object({
    title: z.string().trim().min(1).max(config.limits.deckTitleMaxChars),
    examName: z.string().trim().min(1).max(config.limits.deckTitleMaxChars),
  });
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : fail(parsed.error);
}

export function parsePlanImportParams({ raw, config }: { raw: unknown; config: StudyConfig }): Parsed<PlanImportParams> {
  const { limits } = config;
  const schema = z.object({
    deckKey: z.uuid(),
    fileName: z.string().trim().min(1).max(limits.fileNameMaxChars),
    pageCount: z.number().int().min(1).max(limits.maxPagesPerImport),
    chunks: z
      .array(
        z.object({
          firstPage: z.number(),
          lastPage: z.number(),
          ownFirstPage: z.number(),
        }),
      )
      .max(limits.maxChunksPerImport),
    skippedPages: z.array(z.number().int().min(1)).max(limits.maxPagesPerImport),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  if (parsed.data.skippedPages.some((page) => page > parsed.data.pageCount)) {
    return { ok: false, message: `A skipped page is outside the ${parsed.data.pageCount} page document.` };
  }

  const problem = validateChunkPlan({
    pageCount: parsed.data.pageCount,
    chunks: parsed.data.chunks,
    maxChunks: limits.maxChunksPerImport,
  });
  return problem === null ? { ok: true, params: parsed.data } : { ok: false, message: problem };
}

export function parseCardKeysParams({ raw, config }: { raw: unknown; config: StudyConfig }): Parsed<CardKeysParams> {
  const schema = z.object({
    cardKeys: z.array(z.uuid()).min(1).max(config.limits.maxCardKeysPerRequest),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);
  return { ok: true, params: { cardKeys: [...new Set(parsed.data.cardKeys)] } };
}

export function parseEditCardParams({ raw, config }: { raw: unknown; config: StudyConfig }): Parsed<EditCardParams> {
  const { limits } = config;
  const schema = z.object({
    cardKey: z.uuid(),
    edit: z.object({
      prompt: z.string().trim().min(1).max(limits.promptMaxChars),
      answer: buildCardAnswerSchema(limits),
      note: z.string().trim().min(1).max(limits.noteMaxChars).nullable(),
      tags: z.array(z.string().trim().min(1).max(limits.tagMaxChars)).max(limits.tagMaxCount),
      imageHint: z.string().trim().min(1).max(limits.imageHintMaxChars).nullable(),
    }),
  });
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : fail(parsed.error);
}

export function parseAttachFigureParams({
  raw,
  config,
}: {
  raw: unknown;
  config: StudyConfig;
}): Parsed<AttachFigureParams> {
  const schema = z.object({
    cardKey: z.uuid(),
    dataBase64: z.string().min(1),
    widthPx: z.number().int().min(1).max(config.limits.maxImageSidePx),
    heightPx: z.number().int().min(1).max(config.limits.maxImageSidePx),
  });
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : fail(parsed.error);
}

export function parseSubmitReviewParams(raw: unknown): Parsed<SubmitReviewParams> {
  const schema = z.object({ cardKey: z.uuid(), outcome: z.enum(["knew", "missed"]) });
  const parsed = schema.safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : fail(parsed.error);
}

export function parseCardKeyParams(raw: unknown): Parsed<RemoveFigureParams> {
  const parsed = z.object({ cardKey: z.uuid() }).safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : fail(parsed.error);
}

export function parseDeckKeyParams(raw: unknown): Parsed<{ deckKey: string }> {
  const parsed = z.object({ deckKey: z.uuid() }).safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : fail(parsed.error);
}

export function parseImageKeyParams(raw: unknown): Parsed<GetFigureParams> {
  const parsed = z.object({ imageKey: z.uuid() }).safeParse(raw);
  return parsed.success ? { ok: true, params: parsed.data } : fail(parsed.error);
}

export function parseGenerateCardsParams({
  raw,
  config,
}: {
  raw: unknown;
  config: StudyConfig;
}): Parsed<GenerateCardsParams> {
  const schema = z.object({
    importId: z.uuid(),
    chunkIndex: z.number().int().min(0),
    pdfBase64: z.string().min(1),
  });
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return fail(parsed.error);

  // The browser cut the file against this same limit, so a larger one was not cut by our code.
  if (measureBase64Bytes(parsed.data.pdfBase64) > config.generation.maxChunkBytes) {
    return { ok: false, message: "This section of the PDF is too large. Split the file into smaller sections." };
  }
  return { ok: true, params: parsed.data };
}
