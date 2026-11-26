# Anthropic (Claude API) module

A generic pass-through to the Claude Messages API, with optional tools. It knows nothing about customers, the knowledge base or any other feature. Features that want Claude build on it; it does not depend on them.

`/anthropic` is a **temporary test page** (a plain chat). It is not linked from the nav and can be deleted without touching the rest of the module.

## Setup

- `SGMONTI_ANTHROPIC_KEY` in `.env.local` and in the Vercel project settings. Restart the dev server after adding it. Without it the route returns a clear operational error.
- The user needs the `claudeRequests.write` capability (group `aiAssistant`). Capabilities match exactly, so grant it in the admin matrix.
- `@anthropic-ai/sdk` is the only dependency added.

## Files

| File | Role |
|---|---|
| `anthropicConst.ts` | Allowed models, default model, token and size limits (including the PDF limits), tool loop cap, SDK timeout and retries |
| `AnthropicTypes.ts` | This module's own types. Client code never imports the SDK |
| `anthropicSchema.ts`, `anthropicRequest.ts` | Zod validation of the request body and the pre-flight checks (the route trusts nothing) |
| `anthropicServer.ts` | **The only file that imports the SDK.** Server only: it holds the key. Maps SDK errors to `AppError` |
| `api/AnthropicContract.ts`, `api/route.ts` | One op, `sendMessage`, gated by `can.claudeRequests.write` |
| `anthropicToolLoop.ts` | `runToolLoop`: send, run requested tools, repeat. The send function is injected, so it runs without a network |
| `anthropicTools.ts` | `defineTool`: one zod schema is both the JSON schema Claude sees and the check on its input |
| `anthropicLogic.ts`, `anthropicPricing.ts` | Pure helpers: history, usage and cost, notices |
| `anthropicClient.ts`, `useAnthropicChat.ts`, `_components/` | Browser side of the test page. State is local `useState` |
| `anthropicDemoTools.ts` | One demo tool for the test page. Delete with the page |

## The contract

`POST /anthropic/api` with `{ op: "sendMessage", model?, system?, messages, tools?, toolChoice?, maxTokens? }`. Success returns `{ success: true, payload: { content, stopReason, usage: { inputTokens, outputTokens }, model } }`.

- It is **stateless**. Claude remembers nothing between calls, so the caller sends the whole conversation every time. Input tokens therefore grow with every turn.
- Content blocks keep the API's snake_case names (`tool_use`, `tool_use_id`, `is_error`) because they go back to Anthropic verbatim. Thinking blocks must come back unmodified, so the chat stores and resends them as received.
- Tools are sent as `{ name, description, inputSchema }`. The function that runs a tool never leaves the caller.

## Guardrails (server enforced)

- Model must be in `ALLOWED_MODELS` (Haiku, Sonnet, Opus 5.5). Fable is left out as too costly for a test page.
- `max_tokens` is capped. **Thinking is on by default for these models and its tokens count toward `max_tokens` and are billed as output**, so the default is generous.
- Message count, tool count, system prompt length and total request size are capped. The size cap keeps a request well below Haiku's 100,000-token price step.
- Upstream failures (bad key, rate limit, overload, no credit, timeout) become plain-language messages. Status codes and bodies stay in the server log.
- Each call logs the model and token counts.

## Tools

```ts
const getCurrentTime = defineTool({
  name: "getCurrentTime",
  description: "...",
  input: z.object({ timeZone: z.string().optional() }),
  run: ({ timeZone }) => `...`,
});
```

`runToolLoop` calls the API; if the reply asks for tools it validates each input, runs the tool, sends back the result and repeats until Claude answers or `MAX_TOOL_ITERATIONS` (6) is reached. The last allowed call is sent with `toolChoice: "none"`, so Claude has to answer in text instead of asking for another tool, and the turn gets a notice saying so (`forcedFinalAnswer`). Bad input, an unknown tool or a failing tool goes back to Claude as an error result, so one bad call does not end the run. Tool output is capped at `MAX_TOOL_RESULT_CHARS`. Usage is summed over every call, so a prompt that took three calls shows its real cost.

## Cost

Prices are in `anthropicPricing.ts` with the date they were read (`PRICES_READ_ON`). They are **estimates**: the Claude Console usage report is the real bill. Haiku 5.5 charges a higher rate for a request whose prompt is over 100,000 tokens, and each call is priced on its own prompt size. Prompt caching is not used, so it is not priced.

## PDFs (server callers only)

A `DocumentBlock` (`type: "document"`, base64 `application/pdf`) lets the model read a PDF, text and page images both. It is **not** available through `/anthropic/api`: `sendMessageParamsSchema` and `chatMessageSchema` do not list it, so the browser route rejects it, and a saved conversation can never hold one (it would blow `MAX_TURN_CHARS`). Only a feature that builds its own request on the server uses it, and it calls `sendToAnthropic` directly.

- Check the request with `checkSendMessageParams` (`anthropicRequest.ts`), the same checks the route runs after its schema. It caps the PDF at `MAX_DOCUMENT_BYTES` (decoded bytes) and one PDF per request, and measures the text cap without the PDF's base64, since a PDF costs the model pages, not characters. The 100-page limit per request is Anthropic's, and it rejects an over-long PDF itself.
- A server caller may pass `maxTokens` up to `MAX_SERVER_TOKENS_CAP` (the browser schema stops at `MAX_TOKENS_CAP`) and `timeoutMs` to replace the 50 second default (which also turns off the SDK retry, since the caller owns the budget). Both are ignored by the browser route, which strips unknown fields. The route's `maxDuration` still bounds the whole request, so a caller's own route must set its own.
- A Vercel request body is limited to about 4.5 MB by default, and base64 adds a third. A feature that receives the PDF through a route must split it into smaller pieces first.
- `MAX_SERVER_TOKENS_CAP` is 24,000. The SDK refuses a non-streaming call it estimates at over 10 minutes (above about 21,000 tokens) only when no timeout is given, so a caller above that must pass `timeoutMs`. The study import does. A long answer is limited by time (the route's `maxDuration`) before it is limited by tokens.
- Thinking tokens still count toward `maxTokens`.

## Not built

Streaming, prompt caching, image attachments, any feature tools (knowledge base, customers), server-side tools that run inside the route, and tests.