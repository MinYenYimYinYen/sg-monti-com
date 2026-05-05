# ETA Module — Implementation

## Task List

### Human Tasks

- [x] Y1: New types — `Eta`, `ServiceEta`
- [x] Y2: Mongoose model — `ServiceEtaModel`
- [x] Y3: API contract — `ServiceEtaContract`
- [x] Y4: API route — `getServiceEtas` + `saveServiceEta` handlers
- [x] Y5: Redux slice — `serviceEtaSlice` with `getServiceEtas` + `saveServiceEta` thunks
- [x] Y6: Selectors — `serviceEtaSelect` with `serviceEtaMap`
- [x] Y7: Hook — `useServiceEta({ servIds })`
- [x] Y8: Type surgery — move `eta` from `ServiceDocProps` → `ServiceProps`
- [x] Y9: Remove `sequence` from `AssignmentDoc` and all dependents — **skipped, sequence is used elsewhere**
- [x] Y10: Wire `serviceEtaSelect.serviceEtaMap` into `centralSelectors` (replace `pendingEtas` merge)
- [x] Y11: Gut `centralDocPropsSlice` — remove `pendingEtas` state, `saveEta` thunk, all related cases
- [x] Y12: Remove `saveEta` from `csvContract.ts` and `csv/api/route.ts`
- [x] Y13: Register `serviceEtaReducer` in `src/store/reducers/index.ts`

### AI Tasks

- [x] A1: Wire `useServiceEta` into `useCoverSheetDeps` — depends on Y7, Y8
- [x] A2: Wire `useServiceEta` into `usePrenotify` — depends on Y7, Y8
- [x] A3: Update `EtaServiceRow` to dispatch `serviceEtaActions.saveServiceEta` — depends on Y5, Y8

---

## Deviations from Plan

The implementation used different names than the plan snippets. All names are internally consistent.

| Plan name | Actual name |
|---|---|
| `EtaEntry` | `Eta` |
| `EtaDoc` | `ServiceEta` |
| `entries` (array field) | `etas` |
| `EtaModel.ts` | `api/ServiceEtaModel.ts` |
| `EtaContract.ts` | `api/ServiceEtaContract.ts` |
| `etaSlice.ts` | `serviceEtaSlice.ts` |
| `etaSelect.ts` | `serviceEtaSelect.ts` |
| `useEta.ts` | `useServiceEta.ts` |
| `etaActions` | `serviceEtaActions` |
| `etaSelect` | `serviceEtaSelect` |

**Y9 skipped**: `sequence` was kept on `AssignmentDoc` because it is used elsewhere in the app. The `scheduleChanged` detection in `csv/api/route.ts` still references `sequence`, but no longer has any effect on ETA (ETA is now managed independently in the `ServiceEta` collection).

**`Eta.invoice` is non-nullable**: The plan specified `invoice: number | null` to support pre-invoice ETAs. The decision was made that ETAs are only entered after invoicing, so `invoice: number` is correct.

**`hydrateEta` extracted**: Rather than inlining the ETA lookup in `centralSelectors.ts`, a `hydrateEta` helper was created at `src/app/realGreen/customer/selectors/hydrateEta.ts`.

**`customCondition` added to `getServiceEtas`**: The slice adds a `customCondition` guard that skips the thunk when `servIds` is empty, in addition to the `transformParams` deduplication.

**`staleTime` added to `useServiceEta`**: Uses `realGreenConst.paramTypesCacheTime` to prevent redundant refetches.

---

## File Structure (actual)

```
src/app/scheduling/eta/
  EtaTypes.ts
  serviceEtaSlice.ts
  serviceEtaSelect.ts
  useServiceEta.ts
  docs/
    etaPlan.md
    etaImplementation.md
  api/
    route.ts
    ServiceEtaContract.ts
    ServiceEtaModel.ts

src/app/realGreen/customer/selectors/
  hydrateEta.ts          ← new helper
```

---

## Status Table

| Task | Owner | Status | Depends on |
|------|-------|--------|------------|
| Y1 | Human | ✅ | — |
| Y2 | Human | ✅ | Y1 |
| Y3 | Human | ✅ | Y1 |
| Y4 | Human | ✅ | Y2, Y3 |
| Y5 | Human | ✅ | Y3, Y6 |
| Y6 | Human | ✅ | Y1 |
| Y7 | Human | ✅ | Y5 |
| Y8 | Human | ✅ | — |
| Y9 | Human | ⏭ skipped | — |
| Y10 | Human | ✅ | Y6, Y8 |
| Y11 | Human | ✅ | Y10 |
| Y12 | Human | ✅ | Y9 |
| Y13 | Human | ✅ | Y5 |
| A1 | AI | ✅ | Y7, Y8 |
| A2 | AI | ✅ | Y7, Y8 |
| A3 | AI | ✅ | Y5, Y8 |
