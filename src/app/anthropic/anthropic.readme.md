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
| `anthropicConst.ts` | Allowed models, default model, token and size limits, tool loop cap, SDK timeout and retries |
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

`POST /anthropic/api` with `{ op: "sendMessage", model?, system?, messages, tools?, maxTokens? }`. Success returns `{ success: true, payload: { content, stopReason, usage: { inputTokens, outputTokens }, model } }`.

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

`runToolLoop` calls the API; if the reply asks for tools it validates each input, runs the tool, sends back the result and repeats until Claude answers or `MAX_TOOL_ITERATIONS` (6) is reached. Bad input, an unknown tool or a failing tool goes back to Claude as an error result, so one bad call does not end the run. Tool output is capped at `MAX_TOOL_RESULT_CHARS`. Usage is summed over every call, so a prompt that took three calls shows its real cost.

## Cost

Prices are in `anthropicPricing.ts` with the date they were read (`PRICES_READ_ON`). They are **estimates**: the Claude Console usage report is the real bill. Haiku 5.5 charges a higher rate for a request whose prompt is over 100,000 tokens, and each call is priced on its own prompt size. Prompt caching is not used, so it is not priced.

## Not built

Attachments, streaming, prompt caching, any feature tools (knowledge base, customers), server-side tools that run inside the route, and tests.