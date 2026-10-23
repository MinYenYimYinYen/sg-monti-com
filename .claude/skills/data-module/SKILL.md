---
name: data-module
description: Scaffold or modify a data-driven feature that spans a Mongoose model, RPC API route, Redux slice, selectors and a fetching hook (types, model, contract, route, slice, select, use* hook). Use when adding a new collection or entity, adding an API operation or thunk, creating a Doc/Props/entity type, or changing how data is fetched, deduplicated or hydrated.
---

# Data Module

Reference implementation to copy from: `src/app/priceIncrease/seasonIncreases/`.
For deduplication via `transformParams`, see `src/app/assignment/assignmentSlice.ts`.

## Before you start

Read these (they are the source of truth; this skill only orders the steps):
- `src/lib/api/api.readme.md` (required before touching any route or client API call)
- `src/store/store.readme.md` (thunk config, deduplication, caching)
- `src/lib/mongoose/mongo.readme.md` (modeling rules)

## Files to create (camelCase folder under `src/app/<feature>/`)

| File | Purpose |
|---|---|
| `<Feature>Types.ts` | `<Feature>Doc` type (storage shape). Add `<Feature>Props` and `<Feature>` (`Doc & Props`) only if hydration is needed |
| `<Feature>Model.ts` | Mongoose schema + `createModel()` |
| `api/<Feature>Contract.ts` | `interface ... extends ApiContract` with `params` and `result` per operation |
| `api/route.ts` | `HandlerMap<Contract>` + `export const POST = createRpcHandler(handlers)` |
| `<feature>Slice.ts` | Thin slice: data only, thunks via `createStandardThunk` |
| `<feature>Select.ts` | Selectors; resolve FKs into full entities |
| `use<Feature>.ts` | Hook that dispatches the fetch thunk |

## Steps

1. **Types** - `export type XDoc = CreatedUpdated & { ... }` (`CreatedUpdated` from `@/lib/mongoose/mongooseTypes`). Use a natural key (e.g. `seasonIncreasesId`), never `_id`. All dates are ISO 8601 strings. Prefer `type` over `interface`.
   - Suffixes: `Doc` = keys + metadata only; `Props` = hydration additions; no suffix = `Doc & Props`, the only shape UI consumes. Never pass a `Doc` to UI.
2. **Model** - `new Schema<XDoc>({...}, { timestamps: true })`, unique index on the natural key, then `export const XModel = createModel<XDoc>("X", XSchema)` from `@/lib/mongoose/createModel`. Never call `mongoose.model()` directly. Keep the type in the Types file, not the Model file.
3. **Contract** - `export interface XContract extends ApiContract { opName: { params: {...}; result: DataResponse<...> } }`. Use `Record<string, never>` for no params.
4. **Route** - `const handlers: HandlerMap<XContract> = { opName: { roles: [...], handler: async (params) => {...} } }`.
   - Roles are explicit: `"admin" | "office" | "tech" | "public"`.
   - Call `await connectToMongoDB()` first, query with `.lean()`.
   - Return `{ success: true, payload: cleanMongoArray(docs) }` or `cleanMongoObject(doc)` from `@/lib/mongoose/cleanMongoObj`. Never return raw Mongoose documents.
5. **Slice** - one `createStandardThunk<XContract, "opName">({ typePrefix: "x/opName", apiPath: "/<feature>/api", opName: "opName" })` per operation. State holds data only (`docs`); no loading/error/status fields (`uiSlice` handles those via `addMatcher`). Update state in `extraReducers`.
   - Export thunks through an `xActions` object.
   - **Deduplication**: if params are ID lists, add `transformParams: (params, getState) => ...` that filters out IDs already in state (the argument order is `(params, getState)`). Add `customCondition: (arg, { getState }) => ...` only when needed; read `arg.__transformedParams ?? arg.params` and return false when there is nothing to fetch.
   - Only add an explicit status field (`'idle' | 'pending' | 'success' | 'error'`) if the UI genuinely needs to track completion; reset it on unmount. Never use `thunk.fulfilled.match(result)` in components.
6. **Selectors** - `createSelector` from `@reduxjs/toolkit`. Export an object: `export const xSelect = { docs: selectDocs, ... }`. Resolve FK ids to full entities here so components never do lookups (e.g. `mixedByEquipmentId` becomes `mixedByEquipment: Equipment | null`). Use `Grouper` for maps.
7. **Hook** - `use<Feature>()` calls `useAppDispatch()` (from `@/lib/hooks/redux`) and dispatches in `useEffect` with a complete dependency array and `config: { loadingMsg: "..." }`. The hook exposes actions only. **Never** return selected data from the hook; components call `useSelector(xSelect.docs)` directly.

## Rules that are easy to break

- No `useCallback`/`useMemo` (React Compiler is on).
- Props that are functions must end in `Action` (`onSaveAction`).
- Prefer passing an id to a child and letting it `useSelector` + dispatch, over drilling callbacks. If a child gains the ability to dispatch a thunk that has no `transformParams`/`customCondition` guard, flag the duplicate-call risk and ask before proceeding.
- Collection names describe the data (`groupAssignments`), never `items`/`entries`/`records`.
- Multi-argument functions take a destructured object parameter.

## Verify

Run the IDE diagnostics on each edited file. Run `npx tsc --noEmit` only if you changed shared types or signatures. Do not start the dev server.
