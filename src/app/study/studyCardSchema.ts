import { z } from "zod";
import type { StudyConfig } from "@/app/study/studyConst";

// What Claude sends back through the `submitCards` tool. One schema is both the JSON schema Claude
// sees and the check on its answer (`defineTool`). The limits come from `STUDY_CONFIG.limits`, so the
// caps live with the other constants and nothing here is a magic number.

type Limits = StudyConfig["limits"];

function text(maxChars: number) {
  return z.string().trim().min(1).max(maxChars);
}

/** The five answer shapes. Also used to check an answer an admin edits by hand. */
export function buildCardAnswerSchema(limits: Limits) {
  const entry = text(limits.listEntryMaxChars);
  const entries = z.array(entry).min(1).max(limits.listMaxEntries);

  return z.discriminatedUnion("format", [
    z.object({ format: z.literal("text"), text: text(limits.answerTextMaxChars) }),
    z.object({ format: z.literal("points"), points: entries }).describe("An unordered list."),
    z.object({ format: z.literal("steps"), steps: entries }).describe("A sequence where the order matters."),
    z.object({
      format: z.literal("groups"),
      groups: z.array(z.object({ label: text(120), points: entries })).min(1).max(limits.listMaxEntries),
    }),
    z
      .object({
        format: z.literal("table"),
        columns: z.array(text(80)).min(1).max(limits.tableMaxColumns),
        rows: z
          .array(z.array(z.string().max(limits.listEntryMaxChars)).min(1).max(limits.tableMaxColumns))
          .min(1)
          .max(limits.tableMaxRows),
      })
      .refine((table) => table.rows.every((row) => row.length === table.columns.length), {
        message: "Every table row needs exactly one cell per column.",
      }),
  ]);
}

export function buildSubmitCardsSchema({
  limits,
  generation,
}: {
  limits: Limits;
  generation: StudyConfig["generation"];
}) {
  const chunkPage = z
    .number()
    .int()
    .min(1)
    .describe("The page's position in the attached PDF, counting its first page as 1. Not the printed page number.");

  const card = z.object({
    prompt: text(limits.promptMaxChars).describe("The term, or the question, shown on the front."),
    answer: buildCardAnswerSchema(limits),
    chunkPage,
    sourceQuote: text(limits.sourceQuoteMaxChars).describe("A short passage copied word for word from that page."),
    sectionTitle: text(limits.sectionTitleMaxChars).optional().describe("The heading the content sits under."),
    note: text(limits.noteMaxChars).optional().describe("A worked example or caveat that is not part of the answer."),
    tags: z.array(text(limits.tagMaxChars)).max(limits.tagMaxCount).optional(),
  });

  const imageProposal = z.object({
    answer: text(limits.promptMaxChars).describe("What the picture shows, as a name a learner must recall."),
    imageHint: text(limits.imageHintMaxChars).describe("What to look for on the page, so a person can find and snip it."),
    suggestedPrompt: text(limits.promptMaxChars).optional().describe("A question for the front, such as 'Name this device'."),
    chunkPage,
  });

  return z.object({
    cards: z.array(card).max(generation.maxCardsPerCall),
    imageProposals: z.array(imageProposal).max(generation.maxImageProposalsPerChunk),
  });
}

export type SubmitCardsInput = z.infer<ReturnType<typeof buildSubmitCardsSchema>>;
