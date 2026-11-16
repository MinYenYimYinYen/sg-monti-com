# Knowledge Base: Plan and Contract

## Read this first

This file describes the `knowledgeBase` module of the sg-monti-com web app. It is written for two readers: the developer, and Claude running inside the external desktop app, which has no other context about this project.

**This module owns** authoring and storing the knowledge base (topics and documents) in MongoDB, and serving it over an API.

**This module does not do:** call Claude, classify transcripts, match signals, rank or choose documents, or convert HTML to markdown. Those belong to the external desktop app.

**The external desktop app** logs in per user (username and password), reads this data, and is responsible for everything in section 5.

### Status labels

- **Implemented**: exists in code today.
- **Decided**: agreed, not yet in code.
- **Deferred**: deliberately postponed. Do not build or assume it.
- **Not decided yet**: open. Do not treat as fact.

### Current code state

- **Layout:** the two modules live in sibling folders, `topic/` and `topicDetail/`, each with its own `api/` route.
- **Implemented:** the `TopicDetail` module (in `topicDetail/`): types, model, contract, route, slice, selectors, hook, and the pure helpers in `topicDetailLogic.ts`.
- **Implemented for Topic:** the shape in section 3 (`guidance` and `avoid` are removed from the type and the model), signal normalization, and the blocked delete (section 8). The pure helpers are in `topic/topicLogic.ts`.

## 1. Goal

Help a CSR on a call by showing relevant documentation, while keeping Claude token cost as low as possible.

- Claude's starting context is only the topic list plus the transcript or search text.
- The desktop app starts a fresh Claude conversation for each prompt and adds only the documents the user chose.
- Everything stored here is plain, flat, and keyed by natural keys, so the desktop app can decide cheaply what to fetch and send.

## 2. Principles

- Decided: keep the structure as simple as possible until the proof of concept works here and in the desktop app. Add concepts only when proven necessary.
- Decided: flat arrays of flat objects related by natural keys. No `_id` in application logic. All dates are ISO 8601 strings.
- Decided: this app stores what the editor needs (HTML). Consumers convert it to what they need.

## 3. Data model

Two collections. They stay separate because they have different shapes and different read patterns: topics are always loaded and tiny, documents are larger and loaded on demand. A topic must also be able to exist before any document is written for it.

### Topic (Implemented)

| Field | Type | Meaning |
|---|---|---|
| `topicKey` | string, unique | Natural key. Never changes after creation. |
| `name` | string | Display name. |
| `description` | string | When this topic applies. The only topic text Claude's classifier reads. |
| `signals` | string[] | Phrases for programmatic matching in the live transcript. Never sent to Claude. |
| `createdAt`, `updatedAt` | ISO string | Timestamps. |

- A topic holds no guidance text. Guidance is a document tagged with a single topic (for example `[aeration]`). Earlier versions of Topic had `guidance` and `avoid` fields; they no longer exist.
- Implemented: signals are stored trimmed, lowercased, and deduplicated (the server enforces this), so the desktop app can lowercase transcript text before matching. Internal whitespace is left as written.

### TopicDetail (Implemented)

One document per **tag set**.

| Field | Type | Meaning |
|---|---|---|
| `detailKey` | string, unique | Derived by the server from the sorted tags joined with `+`, for example `aeration+sales`. Clients never send it. |
| `topicKeys` | string[] | The tag set. Sorted, deduplicated, non-empty. Every key is an existing `topicKey`. |
| `title` | string | Display title. |
| `contentHtml` | string | The document body as TipTap HTML. The only content field. |
| `createdAt`, `updatedAt` | ISO string | Timestamps. |

Why one document per tag set: the tag set is the identity, so the relationship between a document and its topics is stored in the document itself. There is no separate link collection.

Why tags are sorted: `[sales, aeration]` and `[aeration, sales]` must be the same document.

Changing the tags of an existing document changes its `detailKey`, so it is a different document. The old one stays until it is removed separately.

## 4. Retrieval rule (the contract for consumers)

The server does **not** filter. The desktop app fetches everything and applies this rule itself.

Given `matchedTopicKeys`, the candidate documents are every TopicDetail whose `topicKeys` is a subset of `matchedTopicKeys`.

```
candidates = details.filter(d => d.topicKeys.every(k => matchedTopicKeys.includes(k)))
ordered    = candidates sorted by d.topicKeys.length ascending   // general to specific
```

Example, with matched topics `[sales, aeration]`:

| Document | `topicKeys` | Candidate |
|---|---|---|
| How to sell | `[sales]` | yes |
| What aeration is | `[aeration]` | yes |
| How, when and why to sell aeration | `[aeration, sales]` | yes |
| Pricing objections | `[pricing, sales]` | no (`pricing` not matched) |

- General documents stay relevant when a more specific one also matches. A `[sales]` document is still the overview when `[aeration, sales]` also applies.
- **Conflicts:** the document with more tags is more specific and wins. Ordering general to specific lets the consumer tell Claude that the later section overrides the earlier one.
- Tie-breaking between documents with the same number of tags is Not decided yet. No automatic winner exists.

## 5. How the desktop app is expected to use this (consumer notes)

This describes the external app's job. It is not behavior of this module.

1. **Signals (no tokens).** The transcriber matches each topic's `signals` against live text. The matching method (substring, word boundary, fuzzy) is the desktop app's decision. Signals are meant to be exploited so Claude is not called at every step.
2. **Suggestion.** Matched topics produce suggested documents using the retrieval rule in section 4. Signals only suggest. They never load anything into Claude automatically.
3. **User selection.** When the user asks Claude for help, the user picks which suggested documents to include.
4. **Conversion.** The desktop app converts the chosen documents' `contentHtml` to markdown (or text) before sending to Claude. Raw HTML costs more tokens and its tags carry nothing Claude needs. Conversion is the desktop app's responsibility.
5. **Classification (optional).** Claude can pick topics when signals are not enough. Its input is the list `{ topicKey, description }[]` for every topic, and nothing else from the topic. In particular, signals are not sent.
6. **Fresh conversation per prompt:** the transcript or query plus the chosen documents.

## 6. HTML contract

Documents are authored in TipTap and stored as its HTML output.

- Not decided yet: the final list of enabled extensions. The editor is phase 2. These packages are installed: StarterKit, Table (with row, header, cell), Highlight, Color, TextStyle, Mention. The list here must be updated when the editor is built.
- Known caveat for the converter: TipTap wraps the contents of table cells in `<p>` elements. A naive HTML to markdown conversion can break table rows because of this. Test tables early.

## 7. API

Each module has its own route. Topic is at `/knowledgeBase/topic/api`. TopicDetail is at `/knowledgeBase/topicDetail/api`.

**Call shape:** HTTP `POST` with a JSON body `{ "op": "<operation>", ...params }`.

**Response envelope:**

- Success: `{ "success": true, "payload": <result> }`
- Operational failure (validation, blocked delete): HTTP 200 with `{ "success": false, "message": string, "op": string }`. Check `success`, do not rely on the HTTP status.
- Authentication or permission failure: HTTP 401 or 403.
- Unexpected failure: HTTP 500 with `{ "success": false, "message": "Internal Server Error" }`.

**Operations (identical for both modules):**

| Op | Topic | TopicDetail |
|---|---|---|
| `getAll` | all topics, including `signals` | all details, including `contentHtml` |
| `upsert` | one topic, keyed by `topicKey` | one detail, keyed by the server-derived `detailKey` |
| `remove` | one topic, by `topicKey` | one detail, by `detailKey` |

- Implemented: both modules share the `knowledgeTopics` capability (`read`, `write`, `delete`), in the `knowledgeBaseTopics` permission group. The desktop app only needs `read`. Authoring needs `write` and `delete`. This is not `callTopics`, which belongs to RealGreen's call log feature and is unrelated.
- Decided: there is no server-side `resolve`, no fetch-by-keys call, and no markdown endpoint.
- Implemented: `getAll`, `upsert`, `remove` for both Topic and TopicDetail.
- TopicDetail `upsert` takes `{ topicKeys, title, contentHtml }`. The server returns the saved document including the derived `detailKey`.

## 8. Integrity rules (enforced by the server)

- Implemented, Topic `upsert`: signals are trimmed, lowercased, and deduplicated. An upsert replaces the whole topic, so a request without `signals` saves an empty list.
- Implemented, TopicDetail `upsert`: a title is required, and `topicKeys` is normalized (deduplicated, sorted, non-empty) and `detailKey` is derived from it. Any key that is not an existing topic is rejected.
- Implemented, Topic `remove`: blocked with an operational error (HTTP 200, `success: false`) that names the referencing documents, up to five and then a count of the rest. The user must fix or remove those documents first.
- Decided, TopicDetail `remove`: no guard needed, nothing references a document.
- Decided: `topicKey` never changes after creation.

## 9. Phases

- **Phase 1 (data layer):** trim Topic; add TopicDetail (types, model, contract, route, slice, selectors, hook); pure helpers `normalizeTopicKeys` and `resolveDetails` (a reference implementation of section 4); the server rules in section 8. No new dependencies.
- **Phase 2 foundation (Implemented):** `editor/` holds the merged views for the UI: hydrated types (`Topic` with its `documents`, `TopicDetail` with its `topics`), the pure merge helpers, `knowledgeBaseSelect`, and `useKnowledgeBaseDeps`. No components or draft state yet. This is the web app's internal UI code and is not needed by the desktop app.
- **Phase 2 (UI):** topic list and editor (including signals); TopicDetail editor using TipTap for the body and a multi-select topic picker for `topicKeys`; a backlinks view per topic (every document tagged with it). This is the proof of concept for authoring the knowledge base.

## 10. Deferred

Do not build or assume any of these.

- Topic `kind`, parent topics.
- Document `summary` and `tokenEstimate`.
- Inline mentions in document bodies (the TipTap mention extension is installed; adding it would not change the schema).
- A separate link or edge collection with typed relationships.
- Cache versioning or stable ordering of the topic list for prompt caching.
- Several documents for the same tag set (would need a `detailKey` that is not derived).
- Validation of `topicKey` format and seed topics.

## 11. Not decided yet

- Tie-breaking between equally specific documents.
- The final enabled TipTap extension list.

## 12. Files worth reading

In this folder:

- `topic/TopicTypes.ts` and `topicDetail/TopicDetailTypes.ts`: the data shapes.
- `topic/api/TopicContract.ts` and `topicDetail/api/TopicDetailContract.ts`: operation inputs and outputs.
- `topic/api/route.ts` and `topicDetail/api/route.ts`: the server-enforced rules.
- `topicDetail/topicDetailLogic.ts`: `resolveDetails` is the reference implementation of the retrieval rule.

The slice, selector, and hook files are the web app's internal Redux code and are not needed by the desktop app.