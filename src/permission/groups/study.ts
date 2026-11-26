import { defineGroup } from "@/permission/defineGroup";

export const studyGroup = defineGroup({
  key: "study",
  name: "Study",
  description: "Flash cards that prepare employees for licensing exams",
  resources: {
    // Named for the two audiences, as decided with the user, and deliberately separate: holding one
    // never implies the other, so a person who both authors and studies needs both.
    // `read` lists decks and cards in every status (including drafts and image proposals) and
    // stored pictures. `write` imports a PDF, edits cards, attaches pictures and publishes. Importing
    // calls the Claude API, which bills the company's Anthropic account for every chunk, so treat
    // `write` as an administrator's permission. `delete` removes decks, imports and cards.
    studyCardAdmin: { name: "Study card administration", verbs: ["read", "write", "delete"] },
    // `read` loads published cards and their pictures. `write` records the user's own answers.
    studyCardStudent: { name: "Study cards (student)", verbs: ["read", "write"] },
  },
});
