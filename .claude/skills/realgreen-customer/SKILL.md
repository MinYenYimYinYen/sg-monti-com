---
name: realgreen-customer
description: Work on the RealGreen Customer, Program and Service pipeline - entity types (Raw/Core/Doc/hydrated), remap functions, the context-tree selectors, search schemes, the mirror vs RealGreen PIPELINE flag, streaming loads, single-customer refresh, the central merge slice, or any new RealGreen endpoint. Use when touching src/app/realGreen/customer, adding a customer context or hook, adding a search scheme, or importing RealGreen-specific types.
---

# RealGreen Customer Module

These readmes are long. Read only the section you need (use the headings), not the whole file.

| Need | Read |
|---|---|
| Type pipeline, remap/extend/base files, RealGreen type boundary, API infrastructure | `src/app/realGreen/realGreen.readme.md` |
| Context-tree selectors, search schemes, `optimizerKey`, bad-record recovery, PIPELINE flag, single-customer refresh | `src/app/realGreen/customer/customer.readme.md` |
| Central aggregator slice, merge strategy, hooks architecture | `src/app/realGreen/customer/slices/mergeSlice.readme.md` |
| Building test data | `src/app/realGreen/sampleData/samples.readme.md` (and the `write-tests` skill) |
| Hydration details | `src/app/realGreen/customer/selectors/howToHydrate.md` |

**The readmes lag the code in places. Verify file paths and names against the source before relying on them.** Known drift: `customer.readme.md` describes `selectors/contextSelectors.ts` and `_lib/types/SliceTypes.ts`, which no longer exist at those paths (see rules 4 and 7). AGENTS.md has also referenced a `streaming.readme.md` that does not exist in the repo; use the "Handling Bad Records" and "Pipeline Flag System" sections of `customer.readme.md` instead.

Key code locations (verified):
- Hooks: `src/app/realGreen/customer/hooks/` (`useActiveCustomers.ts`, `useFullSeasonServices.ts`, ...)
- Slices and `PIPELINE`: `customer/slices/customerSlices.ts`; slice state types: `customer/slices/SliceTypes.ts`; aggregator: `customer/slices/centralCustomerSlice.ts`
- Selectors: `customer/selectors/centralSelectors.ts` (`centralSelect`, `makeCustomersSelector`)
- Search schemes: `customer/_lib/searchUtil/searchSchemes/searchSchemes.ts`
- Mirror queries: `customer/mirror/` (`QueryBuilder`, `useMirrorQuery.ts`, `useCustomerQuery.ts`)

## Rules to keep in mind

1. **RealGreen type boundary.** RealGreen-shaped types (`RGStringRange`, `RGNumRange`, `CustStat`, anything in `_lib/subTypes/`) may appear only in `*Raw` types and `remap*` / `remapSearch*` functions. Everywhere else (Core, Doc, selectors, hooks, components, search criteria) use our types (`TRange<string>`, `string[]`). Importing a RealGreen type in a selector, hook or component is a bug: move the conversion into the remap layer. Writes back to RealGreen follow the same rule in reverse (`remap*Write` at the boundary).
2. **Four-stage entity pipeline**: `Raw` (API shape) -> `Core` (clean camelCase) -> `Doc` (= `Core & DocProps`, native keys and metadata) -> hydrated no-suffix entity (= `Doc & Props`). Files per entity: `types/`, `bases/` (`base<Entity>` fallbacks), `funcs/` (`remap<Entity>`, `extend<Entity>s`).
3. **Search criteria**: for each endpoint define `*SearchRaw`, `*SearchCriteria` and `remapSearch*`. Hooks, slices and contracts use `*SearchCriteria` only; call `remapSearch*` once, immediately before the `rgApi` call.
4. **Selectors hydrate through `makeCustomersSelector` and `centralSelect`** (`customer/selectors/centralSelectors.ts`). The Context Tree / "Terminating DAG" idea in `customer.readme.md` (a base tree built top-down with `Grouper`, with parent pointers added so `service.program.customer.programs` works without circular references that break Immer, DevTools and `JSON.stringify`) is the reasoning behind this design, but the original `contextSelectors.ts` is in `_lib/deprecated/` and `centralTerminatingSelectors.ts` is commented out. Do not revive them; read `centralSelectors.ts` for the current approach. Source slices use `BaseCustomerState` (arrays of docs) and the central slice uses Maps, both in `customer/slices/SliceTypes.ts`. To add a new relation to the hydrated entities, follow `customer/selectors/howToHydrate.md` (Base -> Central -> Rich).
5. **PIPELINE flag**: `PIPELINE` in `customer/slices/customerSlices.ts` selects `"mirror"` (synced MongoDB, ~5 s) or `"realGreen"` (live API, ~38 s) per context. Hooks branch on it (`PIPELINE.fullSeasonServices === "mirror"` builds a `QueryBuilder` plan, otherwise passes `schemeName` + `season`). To migrate or roll back a context, follow `customer/mirror/MirrorRefactor.md`. Keep the search scheme in `searchSchemes.ts` and the RealGreen branch in the hook for rollback. `corruptedRecords` and `customerQuery` are mirror-only. The `(dispatch as any)` cast (with the eslint-disable comment) at dispatch sites is the established pattern because the thunk's param type is a union of two shapes; scope the `any` to the dispatch call only.
6. **Search schemes**: give every step a unique `optimizerKey` when two steps in one scheme share a `stepName`, or the optimizer mixes pagination and batch-size strategies and crashes.
7. **Single-customer refresh** re-runs the *same* scheme as the original load (not `singleCustomer`) with `custId` injected into every step and fixed optimizer values, via the per-context `<context>Refresh` thunk made by `createRefreshCustomerThunk` in `customerSlices.ts`. It always uses the RealGreen API regardless of `PIPELINE`. The readme and `refreshCustomerImplementationPlan.md` describe a `useRefreshCustomer` hook that was never created; the current pattern is the hook's own `refreshCustomer(custId)` (see `useFullSeasonServices.ts`), which dispatches the refresh thunk and then `replaceCustomer(...)` or `removeCustomer(custId)` when the result is empty.
8. **RealGreen routes** use `createRealGreenRpcHandler`, not `createRpcHandler`, and call `rgApi` / `rgSearchApi`, never raw `fetch`. See the `api-route` skill.
9. In tests, build entities only with `generateCustomer`. Never construct `Customer`, `Program` or `Service` by hand.
