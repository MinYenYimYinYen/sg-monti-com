# ETA Module — Plan

## Context / Problem

ETAs (estimated arrival windows like "8am–10am") are currently stored as a single `eta: string | null`
field on `ServiceDocProps` — the same MongoDB document that tracks assignments. The `saveAssignments`
handler clears `eta` whenever the schedule changes (date, employee, or sequence). This causes two bugs:

1. **Same-session**: `pendingEtas` in Redux holds a stale ETA after reschedule, masking the cleared value.
2. **Cross-session**: A different user on a different machine reads `eta = null` from MongoDB after a
   reschedule, even if the manager re-entered the ETA in a different session.

The root cause is architectural: ETA is shoe-horned into the assignment lifecycle when it has its own
independent lifecycle.

## Desired Behavior

- ETAs are entered by the production manager on the CoverSheets page (EtaSetupPanel / EtaServiceRow).
- ETAs appear in the Prenotify page (PrenotifyByType Manual section) for all users in all sessions.
- Rescheduling work (uploading a new CSV with a different date/employee) does NOT clear the ETA.
- The ETA is naturally "reset" when the service gets a new invoice (re-invoiced in RealGreen), because
  the lookup key changes.
- No manual clearing logic is needed anywhere.

## Data Model

### `EtaEntry`
```typescript
type EtaEntry = {
  invoice: number | null;  // null = not yet invoiced (pre-service ETA)
  eta: string;
};
```

### `EtaDoc` (MongoDB, one document per service)
```typescript
type EtaDoc = CreatedUpdated & {
  servId: number;           // unique key
  entries: EtaEntry[];      // history of ETAs per invoice
};
```

### Lookup logic (in `centralSelectors`)
```typescript
const currentInvoice = servDoc.invoice ?? null;
const etaDoc = etaMap.get(servDoc.servId);
const eta = etaDoc?.entries.find(e => e.invoice === currentInvoice)?.eta ?? null;
```

`null === null` works correctly in JS strict equality, so pre-invoice ETAs are found by `invoice: null`.

### Why not key by `invoice` alone?
Invoice is `null` for all unserviced work (which is when ETAs are entered). Keying by `servId` first,
then `invoice` within the entries array, gives us both correct lookup and a natural history.

## API Contract

```typescript
interface EtaContract extends ApiContract {
  getEtas: {
    params: { servIds: number[] };
    result: DataResponse<EtaDoc[]>;
  };
  saveEta: {
    params: { servId: number; invoice: number | null; eta: string };
    result: DataResponse<EtaDoc>;
  };
}
```

## State Management

### New slice: `etaSlice`
- State: `{ etaDocs: EtaDoc[] }`
- `getEtas` thunk: `createStandardThunk`, with `transformParams` to filter out already-loaded `servId`s
- `saveEta` thunk: `createStandardThunk`
- `getEtas.fulfilled`: merge/replace docs by `servId`
- `saveEta.fulfilled`: upsert returned doc by `servId`

### New selectors: `etaSelect`
- `etaMap`: `Map<number, EtaDoc>` keyed by `servId`

### New hook: `useEta`
- Signature: `useEta({ serviceIds: number[] })`
- Dispatches `getEtas` when `serviceIds` changes
- Used in `useCoverSheetDeps` and `usePrenotify`

## Type Placement

`eta: string | null` moves from `ServiceDocProps` (stored) to `ServiceProps` (hydrated).
It is still accessible as `service.eta` everywhere — no consumer changes needed.

## Changes to Existing Code

### `ServiceTypes.ts`
- Remove `eta: string | null` from `ServiceDocProps`
- Add `eta: string | null` to `ServiceProps`

### `ServiceDocPropsModel.ts`
- Remove `eta` field from schema

### `baseService.ts`
- Remove `eta: null` from `baseServiceDocProps`
- Add `eta: null` to `baseServiceProps` (the `ServiceProps` base values)

### `centralSelectors.ts`
- Add `etaSelect.etaMap` as selector input
- Replace `pendingEtas` merge with `etaMap` lookup

### `centralDocPropsSlice.ts`
- Remove `pendingEtas` state, `saveEta` thunk, all related `addCase` handlers

### `centralDocPropsSelect.ts`
- Remove `pendingEtas` selector

### `csv/api/csvContract.ts`
- Remove `saveEta` operation

### `csv/api/route.ts`
- Remove `scheduleChanged` detection and ETA-clearing logic from `saveAssignments`
- Simplify: always upsert the new assignment, never touch eta

### `AssignmentTypes.ts`
- Remove `sequence: number` field

### `unservicedParser.ts`
- Remove `Sequence` column mapping, schema field, and advisory check

### `EtaServiceRow.tsx`
- Dispatch `etaActions.saveEta({ servId, invoice: service.invoice ?? null, eta })` instead of
  `centralDocPropsActions.saveEta`

### `useCoverSheetDeps.ts`
- Add `useEta({ serviceIds })` — get `serviceIds` from `useSelector(coverSheetsSelect.printedServices)`

### `usePrenotify.ts`
- Add `useEta({ serviceIds })` — get `serviceIds` from `useSelector(centralSelect.serviceDocs).map(s => s.servId)`

### `store/reducers/index.ts`
- Add `eta: etaReducer`

## Open Questions / Decisions Made

| Question | Decision |
|---|---|
| Key by `invoice` or `servId`? | `servId` (document key) + `invoice` (entry key within array) |
| What if invoice is null? | `invoice: null` in `EtaEntry` — null === null works in JS |
| Auto-clear on reschedule? | Never — ETA persists until invoice changes |
| Auto-clear on new invoice? | Naturally — old entry doesn't match new invoice |
| Lazy or auto-load? | Lazy — `useEta({ serviceIds })` called per page |
| Migrate existing data? | No — existing ETAs are unreliable (the bug). Re-enter after deploy. |
| Remove `sequence` from `AssignmentDoc`? | Yes — it existed only for ETA-clearing detection |

## File Structure

```
src/app/eta/
  EtaTypes.ts
  EtaModel.ts
  EtaContract.ts
  etaSlice.ts
  etaSelect.ts
  useEta.ts
  docs/
    etaPlan.md
    etaImplementation.md
  api/
    route.ts
```
