# Study module

An Anki-style flash card tool that prepares employees for licensing exams. An admin uploads a study PDF, Claude reads it a section at a time and proposes cards, the admin reviews and publishes them, and employees study them with spaced repetition. Every answer is logged per person.

> **Keep this readme current.** It describes the code as it stands. When a change makes anything below untrue (a file moved or renamed, an op added or removed, a constant's meaning, a rule about who may do what, the shape of a stored document), update this file in the same change. Section 15 lists which part to touch. A readme that has drifted is worse than none, because the next reader will trust it.

Manager reporting is planned but not built. See `managerReportingPlan.md`.

## 1. The flow

1. **Import** (admin): choose a deck and a PDF. The browser cuts the PDF into small sections, and the server sends each one to Claude, which submits text cards and picture ideas as drafts.
2. **Review** (admin): accept or dismiss picture ideas, paste a snipped picture onto each accepted one, fix wording, then publish.
3. **Study** (employee): see the front of a card, reveal the answer, press "I knew it" or "I didn't". A scheduler decides when the card comes back.

## 2. Pages and access

| Page | Path | Gate | Purpose |
|---|---|---|---|
| Study | `/study` | `studyCardStudent.read` | Choose a deck and study it |
| Review | `/study/review` | `studyCardAdmin.read` | Decide on picture ideas, add pictures, edit, publish |
| Import | `/study/import` | `studyCardAdmin.write` | Create decks, import a PDF, resume an import |

None of the pages is in the nav menu yet. Each is gated with `GatedPanel`, and the server enforces every op regardless.

Two capabilities in the "Study" group (`src/permission/groups/study.ts`). **They never imply each other.** A person who both authors and studies needs both.

| Capability | Verbs and what they cover |
|---|---|
| `studyCardAdmin` | `read`: decks, imports, cards in every status, any picture. `write`: create decks, import (every section is billed to the Anthropic account), edit, accept, publish, unpublish, pictures. `delete`: delete cards |
| `studyCardStudent` | `read`: published cards, pictures of published cards, your own progress. `write`: record your own answers |

The resources are in no bundle until someone adds them. Capabilities match exactly, so grant them in Users and Bundles.

## 3. Setup

- `SGMONTI_ANTHROPIC_KEY` on the server (see `src/app/anthropic/anthropic.readme.md`).
- `pdf-lib` is a dependency of the import page (loaded on demand in the browser).
- `STUDY_CONFIG.generation.model` must be an `AnthropicModelId`. It is Opus, because an import is a one-time cost and quality matters more than price.

## 4. Data model

People are identified by `userName` throughout. Types are in `StudyTypes.ts`, models in `StudyModels.ts`. Every document uses a natural key (a UUID minted by the server), never `_id`, and dates are ISO strings.

| Collection | Key | Holds | When a user is deleted |
|---|---|---|---|
| `StudyDeck` | `deckKey` | Title, exam name, `createdByUserName` | Kept |
| `StudyCard` | `cardKey` | One card in any status | Kept |
| `StudyImage` | `imageKey`, unique `{ deckKey, contentHash }` | One stored JPEG with its bytes | Kept |
| `StudyImport` | `importId` | One PDF's plan and progress, with embedded sections, `importedByUserName` | Kept |
| `CardSchedule` | unique `{ userName, cardKey }` | Where one person stands on one card | **Deleted** (`deleteUserReferences`) |
| `ReviewLog` | none, append-only | One row per answer | **Deleted** (`deleteUserReferences`) |

A card's `cardKey` is never derived from its content: content is edited, and review history hangs on the key.

**Card fields.** `kind` (`text` or `image`), `status` (`proposed`, `draft`, `published`), `prompt` (the front), `answer`, `note`, `sectionTitle`, `sourcePage` and `sourceQuote` (so an admin can check an answer against the PDF), `tags`, `sortOrder`, `importId` and `importChunkIndex` (which section produced it), and for picture cards `imageHint` (what to look for) and `imageKey` (null until a picture is attached).

**Answer formats** (`CardAnswer`): `text` (a sentence), `points` (unordered list), `steps` (ordered), `groups` (labeled lists), `table` (columns and rows). The format decides how the answer is shown.

Types follow the repo's layering. `StudyCardDoc` is the stored shape. `StudyCard` (`Doc & Props`, with the deck and the user's schedule) is defined, but the screens currently use `StudyCardDoc`.

## 5. Importing a PDF

Files can be very large and a Vercel request body is limited (about 4.5 MB), so the browser cuts the file and each piece is sent on its own.

**Planning** (`studyChunkPlan.ts`, `pdfChunker.ts`). `planChunks` walks the document and fits one section after another. It starts at `startingPagesPerChunk` pages, measures the real size by cutting the range with `pdf-lib` (`measureBytes`, cached), and halves the page count until the piece is under `maxChunkBytes`. Each section after the first also carries `chunkOverlapPages` pages from the previous one, for context only, and records `ownFirstPage`, the first page cards may come from. A single page too large to send alone goes into `oversizedPages`, stored as `skippedPages` on the import, so it is never silently dropped. After an oversized page the next section gets no overlap. The planner is pure: the measurer is injected.

**Running** (`studyImportThunks.ts`, `runImportSections.ts`). Plain thunks, not `createStandardThunk`: a section's PDF is about 4 MB, and the factory would put it in the action's `meta.arg`. `startStudyImport` opens the file, plans, saves the plan (`planImport`), then sends each runnable section through `generateCards`. `resumeStudyImport` does the same for an existing import and needs the same file chosen again: it checks the file name and page count against the import. The file is held in memory only, never stored, so a page reload ends a run and the admin re-selects the file. Progress lives in `state.study.importRun`, so a run survives navigating away. One run at a time. A failed section is recorded and the run continues; after `stopAfterConsecutiveFailures` failures in a row it stops, since the cause is probably shared (no credit, a bad key). **Stop** takes effect between sections: the one being read is already paid for.

**The server op** (`generateCards`, `_lib/runGenerateCards.ts`):

1. `claimChunk` marks the section `generating` atomically, only if it is `pending`, `failed`, or `generating` for longer than `staleClaimMs` (a dead request). A double click or second tab cannot run a section twice. A refused claim says why (`describeUnclaimable`).
2. `generateChunkCards` sends the PDF to Claude with the prompts in `studyPrompts.ts`, and Claude replies by calling the `submitCards` tool (`_lib/submitCardsTool.ts`, schema in `studyCardSchema.ts`). The tool saves nothing: it validates and collects. A page cited outside the section's own pages, or too many picture ideas, is returned to Claude as an error so it can submit again. A prompt already seen in this run is dropped and counted. All of Claude's limits come from `STUDY_CONFIG.limits`.
3. A finished run clears any earlier unfinished cards for that section (`clearUnfinishedCards`, drafts and proposals only), inserts the new ones in one `insertMany`, and marks the section `done`. A failed run discards its cards and marks the section `failed` with a plain-language reason. Cost is added to the section either way, so a section retried three times shows its real total.
4. Any error after the claim (a failed save, a lost connection) also marks the section `failed`, so it is never stuck as `generating`.

**Page numbers.** Claude cites a page counted from 1 within the attached piece, and `buildNewStudyCards` converts it to the uploaded file's own page number. Printed page numbers are never used.

**Time.** One request has `requestBudgetMs` shared by every Claude call it makes, each call gets what is left (capped at `callTimeoutMs`), and no call starts with less than `minimumCallMs`. The route's `maxDuration` is a literal (300) and must stay above the budget. On a Vercel plan with a lower limit, lower the budget with it.

**Claude access.** The PDF travels as a `DocumentBlock`, which only server code can build (see "PDFs" in `src/app/anthropic/anthropic.readme.md`). `generateCards` is the only caller. It uses `checkSendMessageParams`, a server `maxTokens` above the browser cap, and `timeoutMs`.

**What Claude proposes.** Text cards (a term and its definition, a learning objective and its list, and so on) become `draft` cards. Picture ideas (a thing a learner should recognize by sight: a device, equipment, an organism, a symbol) become `proposed` picture cards with an `imageHint`. Claude is told to over-propose and not judge importance: the admin is the filter. Claude cannot produce pictures, so the admin snips them.

## 6. Card states and what an admin may do

```
proposed  --accept-->  draft  --publish-->  published
   |                     |  ^                  |
 dismiss              delete  \--unpublish-----/
(deleted)           (deleted)
```

Only `published` cards reach students. The rules live in one pure file, `studyCardRules.ts` (plus `getPublishBlocker` and `needsImage` in `studyCardLogic.ts`), used by both the server ops and the screen, so the two never disagree.

| Card state | Edit | Delete | Publish | Picture |
|---|---|---|---|---|
| `proposed` (picture idea) | Yes | Yes (dismiss) | No, accept first | No |
| `draft` text card | Yes | Yes | Yes | Not applicable |
| `draft` picture card without a picture | Yes | Yes | **No, attach a picture first** | Attach |
| `draft` picture card with a picture | Yes | Yes | Yes | Replace or remove |
| `published` | **No, take back to draft first** | **No, take back to draft first** | Already | **No** |

A published card is locked on purpose: a silent change to a card students have already learned is worse than one extra click, and deleting it would orphan their history. Taking it back to a draft hides it from students at once.

Every status change re-states the status it expects in the database filter (`moveCards`, `editCard`, `attachFigure`), so a card another admin changed in between is left alone, not overwritten. A bulk change returns the cards as they now are plus a refusal with a reason for each that could not change (`CardChangeResult`), and state is replaced from that, never guessed.

## 7. Pictures

Claude can only say what a picture should show. The admin supplies the pixels, as a screenshot snip.

**Attaching** (`usePicturePaste.ts`, `studyPasteLogic.ts`, `imageEncoder.ts`, `studyImageSqueeze.ts`):

- On the "Needs a picture" tab one card is active (highlighted). A `paste` listener on the document takes an image from the clipboard and attaches it to the active card, then moves to the next waiting card. Snip, Ctrl+V, snip, Ctrl+V works without clicking. The listener stands down while the admin is typing in an input, textarea, select or editable field (`shouldCapturePaste`).
- "Choose a file instead" and "Use this one" cover a file and a different target. "Replace picture" and "Remove picture" are on draft picture cards that already have one.
- The listener uses `useEffectEvent`, so it always sees the latest list without re-subscribing. `usePictureAttach` is the listener-free part (used by the per-row buttons, so one Ctrl+V never fires many listeners); `usePicturePaste` adds the target and the listener, and is used once, in `PicturePanel`.
- The browser decodes the file (`createImageBitmap`), draws it on a **white** canvas (a transparent PNG would turn black in JPEG), and `squeezeToFit` tries each width from `targetWidthPx` down to `minimumWidthPx` (shrinking by `shrinkFactor`), and at each width each quality in `jpegQualitySteps`, keeping the first result under `maxImageBytes` (250 KB). Quality drops before size. If nothing fits it says to crop tighter and the card stays without a picture. Re-encoding drops any metadata. The encoder is injected into `squeezeToFit`, so the search is pure.

**Storing** (`_lib/figureServer.ts`, `studyImageServerLogic.ts`). The server checks everything again: base64 text length first (so a huge string is never decoded), valid base64, size, the JPEG magic bytes, and sane dimensions. It stores one record per `{ deckKey, contentHash }` with an atomic upsert, so the same picture on several cards is stored once and two simultaneous uploads cannot both insert it. The previous picture is deleted afterwards only if no card still uses it (`deleteImageIfUnused`). Deleting a card does the same.

**Serving.** Pictures are returned by normal RPC ops as a `data:` URL (at most about 333 KB), not by a separate route. `getDraftFigure` (`studyCardAdmin.read`) returns any picture. `getPublishedFigure` (`studyCardStudent.read`) returns one only while a published card uses it, so a student cannot read a draft's picture. In the browser `figureCache.ts` keeps a small module-level cache (60 pictures) outside Redux, and `CardFigure` loads by key. A card's picture never changes (a new picture has a new key), so there is nothing to invalidate.

## 8. Studying and scheduling

**The scheduler** (`studyScheduler.ts`) is a two-button take on Anki's SM-2. It is pure: `scheduleReview({ schedule, outcome, now, config })` returns the card's new state, `null` meaning a card the person has never seen. It takes the `scheduling` part of the config as a parameter and never imports `STUDY_CONFIG`, so the config can later become live data without touching it.

| Phase | "I knew it" | "I didn't" |
|---|---|---|
| New card (no schedule) | Treated as `learning` at step 0, so it moves to the next step (the 10 minute one with the shipped config). A card with a single learning step graduates | Stays at step 0, due after the first step's wait (1 minute) |
| `learning` | Next learning step, or graduates after the last | Back to the first learning step |
| `review` | Interval multiplied by the ease, ease unchanged by default | Counts a lapse, loses `easeLossOnMiss` (never below `minimumEase`), interval restarts (`lapseIntervalMultiplier` 0), drops into `relearning` |
| `relearning` | Next relearning step, or back to `review` | Back to the first relearning step |

A new card is a `learning` card at step 0 that is due now, so its first answer is judged like any learning answer. Step 0 is the showing the learner just did, so the first "I knew it" moves on to the 10 minute step, and the one minute wait applies only after "I didn't". This matches how Anki treats a new card.

With the shipped config: learning steps 1 and 10 minutes, relearning step 10 minutes, graduating interval 1 day, starting ease 2.5, minimum ease 1.3, interval between 1 and 365 days. A card with no steps in a phase graduates at once. Ease and interval are rounded.

**Exam date.** When `examDate` is set, no due date is later than `examBufferDays` before it (`capDueAtForExam`), so every card comes up once more before the test. A card is never pushed earlier than the minimum interval from now, so one answered after the cutoff does not become instantly due. It is `null` today.

**The queue** (`studyQueueLogic.ts`, `studySessionLogic.ts`). `buildStudyQueue` splits a deck's published cards into three lists:

1. **Learning**: cards in `learning` or `relearning` whose step has come due. Never cut by a limit, because a card mid-step is already started and its steps are minutes long.
2. **Reviews**: graduated cards that are due, oldest first, up to what is left of `reviewsPerDay`.
3. **New**: cards with no schedule, in reading order (`sortOrder`), up to what is left of `newCardsPerDay`.

`pickNextCard` shows learning first, then reviews, then new. Today's counts come from the review log (`countToday`): an answer to a card first seen that day counts as a new card, an answer to a `review` card counts as a review, and learning answers count as neither. "Today" is the calendar day in `dailyLimits.timeZone` (America/Chicago), whatever zone the server or browser is in. When nothing is left the screen says when the next card comes back and whether a limit held cards back (`heldBack`).

**Recording an answer** (`submitReview` op, `_lib/reviewServer.ts`). The card must be `published`, so a card taken back to a draft cannot collect reviews. The server reads the person's schedule, advances it with `scheduleReview`, upserts it, and appends a `ReviewLog` row with the phase before, and the interval before and after. The identity comes from the verified session, never from the request.

**The screen** (`_components/`). `StudyWorkspace` picks a deck, `StudySession` builds the view and mounts `StudyCardView` with a `key` of the card so every new card starts with its answer hidden. A picture card shows its picture on the front: recognizing it is the question. Buttons are disabled while an answer is being saved, so a double click cannot count twice. Progress (`getMyReviews`) is always loaded fresh (`force`), because a stale schedule would show a card as due that was already answered on another device. The log sent to the client covers only the last 3 days, which is enough to count today's limit across a time zone change.

**The clock.** `useNow.ts` is a shared 15-second `useSyncExternalStore` clock, so components can read the time during render without breaking the Rules of React, and any number of components cost one interval. It returns 0 on the server render, and `StudySession` renders nothing until it has a real time.

## 9. The API (`/study/api`)

One route, `api/route.ts`, with `maxDuration = 300`. Handlers are split by audience: `route.ts` holds decks and imports, `studyReviewHandlers.ts` holds reviewing cards, and `studyStudentHandlers.ts` holds studying. They are merged into one `HandlerMap<StudyContract>`. Params are validated with zod in `studyRequestSchema.ts` (the route trusts nothing in the body), and every op calls `connectToMongoDB()` first. The contract is `api/StudyContract.ts`; each op has exactly one capability.

| Op | Capability | What it does |
|---|---|---|
| `getDecks` | `studyCardAdmin.read` | All decks, newest first |
| `getImports` | `studyCardAdmin.read` | One deck's imports, newest first |
| `createDeck` | `studyCardAdmin.write` | Make a deck |
| `planImport` | `studyCardAdmin.write` | Re-validate and store the browser's section plan |
| `generateCards` | `studyCardAdmin.write` | Read one section with Claude and save its cards (billed) |
| `getCards` | `studyCardAdmin.read` | Every card of a deck in every status |
| `editCard` | `studyCardAdmin.write` | Change front, answer, note, tags, hint (draft or proposed only) |
| `acceptImageIdeas` | `studyCardAdmin.write` | `proposed` to `draft` |
| `publishCards` | `studyCardAdmin.write` | `draft` to `published` (picture cards need a picture) |
| `unpublishCards` | `studyCardAdmin.write` | `published` back to `draft` |
| `deleteCards` | `studyCardAdmin.delete` | Delete drafts and proposals, and unused pictures |
| `attachFigure` | `studyCardAdmin.write` | Store a JPEG and point a draft picture card at it |
| `removeFigure` | `studyCardAdmin.write` | Clear a draft picture card's picture |
| `getDraftFigure` | `studyCardAdmin.read` | Any picture as a data URL |
| `getStudyDecks` | `studyCardStudent.read` | Decks with at least one published card, with counts |
| `getPublishedCards` | `studyCardStudent.read` | Published cards of a deck |
| `getMyReviews` | `studyCardStudent.read` | The caller's schedules and the last 3 days of log |
| `submitReview` | `studyCardStudent.write` | Record one answer |
| `getPublishedFigure` | `studyCardStudent.read` | A picture, only while a published card uses it |

**Identity.** `_lib/studyUserServer.ts` turns the proxy's `x-user-id` (the `saId`) into a `userName` for the people-keyed records. The capability check has already verified the session before a handler runs.

**Responses.** Documents are cleaned with `cleanMongoObject` and `cleanMongoArray`, never returned raw. Picture bytes are never in a list payload: `StudyImageStoredDoc` (with `data`) is used only inside `_lib/figureServer.ts`.

## 10. Client state

Two slices, so the card and study state does not bloat the import slice.

- `studySlice.ts`: decks, imports, and `importRun` (the one running import). Thunks from `createStandardThunk` for `getDecks`, `getImports`, `createDeck`. `planImport` and `generateCards` go through `studyClient.ts` instead (see section 5).
- `studyCardSlice.ts`: `cardDocs` (admin side, every status), `publishedCardDocs` and `deckSummaries` (student side), `scheduleDocs`, `recentReviewLogs`. Status changes come back from the server with the cards as they now are, and state is replaced from that.

Selectors are in `studySelect.ts` and `studyCardSelect.ts`. Pure state helpers are in `studyImportLogic.ts` and `studyCardState.ts`. Hooks expose actions only: `useStudyImport.ts` (`useStudyDecks`, `useStudyImport`), `useStudyCards.ts`, `useStudy.ts` (`useStudyDeckList`, `useStudyDeck`). Components select data directly with `useSelector`. Both reducers are registered in `src/store/reducers/index.ts` (`study`, `studyCard`).

Pictures are deliberately not in Redux (see section 7).

## 11. Configuration (`studyConst.ts`)

Every tunable number lives in one object, `STUDY_CONFIG`, typed as `StudyConfig`. It is hard coded. The pure functions that use it take the relevant part as a parameter instead of importing the constant, so it can later become live data (an admin screen, or a per-user setting) without touching them. The server code and components that read `STUDY_CONFIG` directly are the places to change when it does. `STUDY_STALE_MS` (5 minutes) is the only constant outside the object.

| Group | Setting | Value | Meaning |
|---|---|---|---|
| `scheduling` | `learningStepsMinutes` | 1, 10 | Waits between tries while learning |
| | `relearningStepsMinutes` | 10 | Same, after a lapse |
| | `graduatingIntervalDays` | 1 | First review interval |
| | `startingEase`, `minimumEase` | 2.5, 1.3 | Ease factor start and floor |
| | `easeChangeOnKnew`, `easeLossOnMiss` | 0, 0.2 | Ease change per answer |
| | `lapseIntervalMultiplier` | 0 | Share of the interval kept after a lapse |
| | `minimumIntervalDays`, `maximumIntervalDays` | 1, 365 | Interval clamp |
| | `examDate`, `examBufferDays` | null, 2 | Cap due dates before an exam |
| `dailyLimits` | `newCardsPerDay`, `reviewsPerDay` | 20, 200 | Daily allowance |
| | `timeZone` | America/Chicago | The day a limit counts in |
| `generation` | `model` | `claude-opus-5-5` | Model for imports |
| | `startingPagesPerChunk`, `chunkOverlapPages` | 5, 1 | Section size and overlap |
| | `maxChunkBytes` | 3,000,000 | Raw PDF bytes per section (base64 adds a third) |
| | `maxImageProposalsPerChunk`, `maxCardsPerCall` | 15, 25 | Caps on one submission |
| | `maxOutputTokens` | 24,000 | Thinking tokens count toward it. Must not exceed `MAX_SERVER_TOKENS_CAP` (`anthropicConst.ts`), which is 24,000 too |
| | `callTimeoutMs`, `requestBudgetMs`, `minimumCallMs` | 250,000, 280,000, 20,000 | Time budget (see section 5) |
| | `staleClaimMs` | 360,000 | A `generating` section older than this may be claimed again |
| | `stopAfterConsecutiveFailures` | 2 | Run stops after this many failures in a row |
| | `maxSourceFileBytes` | 300 MB | Refused before the file is read |
| `images` | `maxImageBytes` | 250 KB | Stored size per picture |
| | `targetWidthPx`, `minimumWidthPx`, `shrinkFactor` | 1000, 400, 0.85 | Squeeze search |
| | `jpegQualitySteps` | 0.8, 0.7, 0.6, 0.5 | Tried in order at each width |
| | `maxSourceBytes` | 20 MB | A pasted or chosen file larger than this is refused |
| | `defaultPrompt` | "What does this image show?" | Front of a picture card with no suggested question |
| `limits` | text and list caps, `maxCardKeysPerRequest`, `maxImageSidePx` | see file | Validation caps on what Claude and the admin send |

**Keep these in step.** `maxOutputTokens` must not exceed `MAX_SERVER_TOKENS_CAP`, and a longer answer takes longer, so a section that needs the full allowance can hit the time budget before the token limit. `requestBudgetMs` must stay under the route's `maxDuration` (a literal in `api/route.ts`, because Next reads it at build time). `maxChunkBytes` is chosen so the base64 body stays under the platform limit. `model` must be in `ALLOWED_MODELS` (`src/app/anthropic/anthropicConst.ts`) and priced in `anthropicPricing.ts`.

## 12. Files

All under `src/app/study/`. Names follow the repo: components `PascalCase.tsx`, everything else `camelCase`.

| Area | Files |
|---|---|
| Types and models | `StudyTypes.ts` (stored shapes), `StudyApiTypes.ts` (op params and results), `StudyModels.ts` |
| Config | `studyConst.ts` |
| Scheduling and queue (pure) | `studyScheduler.ts`, `studyQueueLogic.ts`, `studySessionLogic.ts` |
| Card rules (pure) | `studyCardLogic.ts`, `studyCardRules.ts`, `studyCardState.ts`, `studyReviewLogic.ts`, `studyAnswerText.ts` |
| Import (pure) | `studyChunkPlan.ts`, `studyGenerationLogic.ts`, `studyPrompts.ts`, `studyImportLogic.ts` |
| Import (browser) | `pdfChunker.ts`, `runImportSections.ts`, `studyImportThunks.ts`, `studyClient.ts` |
| Import (server) | `_lib/generateChunkServer.ts`, `_lib/submitCardsTool.ts`, `_lib/importChunkServer.ts`, `_lib/runGenerateCards.ts`, `studyCardSchema.ts` |
| Pictures | `studyImageSqueeze.ts`, `imageEncoder.ts`, `studyPasteLogic.ts`, `usePicturePaste.ts`, `figureCache.ts`, `studyImageServerLogic.ts`, `_lib/figureServer.ts` |
| Server helpers | `_lib/studyCardServer.ts`, `_lib/cardActionsServer.ts`, `_lib/reviewServer.ts`, `_lib/studyUserServer.ts`, `studyRequestSchema.ts` |
| API | `api/route.ts`, `api/StudyContract.ts`, `api/studyReviewHandlers.ts`, `api/studyStudentHandlers.ts` |
| State | `studySlice.ts`, `studySelect.ts`, `studyCardSlice.ts`, `studyCardSelect.ts` |
| Hooks | `useStudyImport.ts`, `useStudyCards.ts`, `useStudy.ts`, `usePicturePaste.ts`, `useNow.ts` |
| Pages | `page.tsx` (study), `review/page.tsx`, `import/page.tsx`, with components in `_components/`, `review/_components/`, `import/_components/` |

Outside this folder: `src/permission/groups/study.ts` (the capabilities), `src/store/reducers/index.ts` (the reducers), `src/app/auth/_lib/deleteUserReferences.ts` (deletes `CardSchedule` and `ReviewLog`), and in `src/app/anthropic/`: `DocumentBlock` in `AnthropicTypes.ts`, `checkSendMessageParams` in `anthropicRequest.ts`, and `timeoutMs` in `anthropicServer.ts`.

## 13. Rules to keep when changing this module

- **The two capabilities stay separate.** Never gate a student op with `studyCardAdmin` or the reverse. A student op may only return published cards and the caller's own state.
- **`cardKey` and `imageKey` are opaque UUIDs.** Never derive one from content: edits would orphan review history and pictures.
- **A published card is locked.** Edit and delete require taking it back to a draft first. Do not add an in-place edit without deciding what happens to students' progress.
- **Records that name a person.** `CardSchedule` and `ReviewLog` are deleted with the user and must stay in `deleteUserReferences`. Any new per-user collection must be added there too, or kept deliberately (see `src/lib/mongoose/mongo.readme.md` section 4).
- **Picture bytes never travel in a list.** Keep them out of Redux and out of card payloads.
- **The server re-checks everything the browser did.** Picture size, JPEG header, chunk plan, answer shape, page citations. Do not weaken a server check because the browser already does it.
- **Rules live in pure files.** `studyCardRules.ts` is used by both the server and the screen. Do not copy a rule into a component.
- **No `Date.now()` during render.** Use `useNowMs`.
- **React Compiler is on.** No `useCallback` or `useMemo`. Function props end in `Action`.
- **Do not import `STUDY_CONFIG` into a pure function.** Take the part it needs as a parameter.

## 14. Known limits

- **No unit tests yet.** The pure files (`studyScheduler.ts`, `studyQueueLogic.ts`, `studyChunkPlan.ts`, `studyGenerationLogic.ts`, `studyCardRules.ts`, `studyAnswerText.ts`, `studyImageSqueeze.ts`, `studyImageServerLogic.ts`, `studyPasteLogic.ts`) are all written to be tested without a database or browser.
- **No cost cap.** Each section's cost is recorded and shown, but nothing limits the total spent by an import or by a day of imports.
- **No pagination.** The review screen loads every card of a deck at once.
- **A reload ends a running import.** The file is never stored, so the admin re-selects it and presses Resume.
- **A Vercel plan with a function limit under 300 seconds** needs `requestBudgetMs` and the route's `maxDuration` lowered together.
- **`StudyCard` (`Doc & Props`) is defined but unused.** Screens use `StudyCardDoc`.
- **No nav menu entries** and no bundle assignments. Both are manual.
- **Manager reporting is not built.** The review log is written on every answer, but nothing reads it back for managers. See `managerReportingPlan.md`.

## 15. Keeping this readme current

Update this file in the same change as the code. A quick guide to what to touch:

| If you change | Update section |
|---|---|
| A type or model in `StudyTypes.ts` or `StudyModels.ts`, or who a collection belongs to | 4 |
| A page, a capability, or the nav | 2 |
| Planning, claiming, generating, the prompts, or the `submitCards` tool | 5 |
| A card state, or what an admin may do in it | 6 |
| Picture attaching, storing or serving | 7 |
| The scheduler, the queue, the daily limits, or the study screen | 8 |
| An op, a handler, a contract, or a request schema | 9 |
| A slice, a selector, a hook, or a reducer key | 10 |
| Any value in `STUDY_CONFIG`, or what a setting means | 11 |
| A file added, moved, renamed or deleted | 12 |
| A rule you now rely on or no longer follow | 13 |
| A limit that is fixed or newly found | 14 |

Also check the other readmes that describe things this module touches: `src/app/anthropic/anthropic.readme.md` (PDFs), `src/permission/permission.readme.md` (the Study group), and `src/lib/mongoose/mongo.readme.md` (section 4, records that name a person). When the review log or its keys change, update `managerReportingPlan.md` too.

