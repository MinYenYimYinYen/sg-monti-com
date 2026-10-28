---
name: api-route
description: Create or modify a Next.js API route or client-side API call in this project's type-safe RPC pattern (ApiContract, HandlerMap, createRpcHandler, createStandardThunk, apiStream), including RealGreen routes and error handling with AppError/handleError. Use when adding an API operation, changing roles or params on a route, streaming NDJSON, or deciding how an error should surface to the user.
---

# API Route and Error Handling

Read first (required before touching any route or client API call):
- `src/lib/api/api.readme.md`
- `src/lib/errors/errors.readme.md`

If the data also needs a model, slice, selectors and hook, use the `data-module` skill instead. It covers this skill's steps in context.

## Pattern

One route file per feature at `src/app/<feature>/api/route.ts`, exporting only `POST`. There are no REST verbs; every request is `{ op, ...params }`.

1. **Contract** (`api/<Feature>Contract.ts`): `export interface XContract extends ApiContract { opName: { params: {...}; result: DataResponse<T> } }`.
2. **Route**: `const handlers: HandlerMap<XContract> = { opName: { roles: [...], handler: async (params) => {...} } }` then `export const POST = createRpcHandler(handlers)`.
   - `roles` is mandatory per operation: `"admin" | "office" | "tech" | "public"` (`src/lib/api/types/roles.ts`). Choose the narrowest set. Write operations are usually `["admin"]`.
   - Imports: `createRpcHandler` from `@/lib/api/createRpcHandler`, `HandlerMap` from `@/lib/api/types/rpcUtils`.
3. **Client**: a thunk from `createStandardThunk<XContract, "opName">({ typePrefix, apiPath, opName })` (`@/store/reduxUtil/thunkFactories`). `apiPath` is the route folder path without `route.ts`, e.g. `/priceIncrease/seasonIncreases/api`.

Reference route: `src/app/priceIncrease/seasonIncreases/api/route.ts`.

## Non-negotiable rules

- Never return a raw Mongoose document. Use `cleanMongoObject(doc)` / `cleanMongoArray(docs)` from `@/lib/mongoose/cleanMongoObj` (strips `_id` and `__v`) and remove sensitive fields.
- Await `connectToMongoDB()` (`@/lib/mongoose/connectToMongoDB`) before any model call. Never close the connection.
- Always use `createRpcHandler`. Do not hand-roll `export async function POST`.
- Natural keys in params and results, never `_id`. Dates are ISO strings.
- **RealGreen routes** use `createRealGreenRpcHandler` (`src/app/realGreen/_lib/api/createRealGreenRpcHandler.ts`) instead, which resets and logs the RealGreen call accumulator. Calls go through `rgApi` / `rgSearchApi`, never raw `fetch`. Read `src/app/realGreen/realGreen.readme.md` ("API Infrastructure" and "The RealGreen Type Boundary") first.
- Streaming endpoints return NDJSON and are consumed with `apiStream`; see the `realgreen-customer` skill for the customer pipeline.

## Errors

- Server: throw `new AppError(...)` for expected failures (validation, auth). Those are operational: the user sees the real message and the server logs a warning. Any other thrown `Error` is wrapped as non-operational: the user sees a generic message and the server logs the stack. Do not catch and swallow errors just to return `success: false` yourself; `createRpcHandler` already returns structured JSON, even for 500s.
- External (RealGreen, RingCentral) failures are caught server-side and converted; never let an upstream status leak to the client.
- Client `api()` returns `{ success: false }` as data for operational errors and only throws on network failure or unexpected crashes.
- Thunks built by `createStandardThunk` toast and reject automatically. Do not add your own `try/catch` + toast around a dispatch.
- Expected or background failures (auth checks, token refresh): `handleError(e, { silent: true })`, or `config: { silentError: true }` on the dispatch.
- In components that call `api()` directly: `try { ... } catch (err) { handleError(err) }`.

## Verify

Run the IDE diagnostics on the contract, route and slice. If you changed `ApiContract`, `HandlerMap` or other shared types, also run `npx tsc --noEmit`. Do not start the dev server.
