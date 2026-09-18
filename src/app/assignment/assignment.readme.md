# Assignment Module

## Overview

The Assignment module stores a **complete historical log** of every scheduling event for each service. Each time a service's schedule changes (different employee, date, or sequence), a new `AssignmentDoc` entry is appended to that service's `assignments` array in MongoDB. The array is never truncated — it grows over time and provides a full audit trail.

This design enables:
- Tracking completion rates per employee per date
- Detecting suspicious zero-completion days (reliability analysis)
- Auditing re-assignments and schedule changes over time

---

## Data Model

### `AssignmentDoc`

```typescript
type AssignmentDoc = {
  servId: number;       // The service this assignment belongs to
  employeeId: string;   // The assigned employee
  schedDate: string;    // The scheduled date (YYYY-MM-DD)
  status: string;       // Service status at time of upload
  sequence: number;     // Route stop order (normalized from RealGreen × 10)
  createdAt: string;    // ISO timestamp set server-side at write time
};
```

`AssignmentDoc` entries are stored as a subdocument array on `ServiceDocProps` in MongoDB. Each service has its own `assignments: AssignmentDoc[]` array.

### Storage location

`ServiceDocProps` (MongoDB collection: `ServiceDocProps`):
```typescript
type ServiceDocProps = {
  servId: number;
  assignments: AssignmentDoc[];
  createdAt: string;  // document-level timestamp (Mongoose)
  updatedAt: string;
};
```

---

## Write Rule — Append-Only with Deduplication Guard

**Source**: `src/app/csv/api/route.ts` (`saveAssignments` handler)

Assignments are written when an Unserviced Report CSV is uploaded. The write rule is:

> **Append a new entry only if the incoming assignment differs from the most recent one for that `servId`.**

"Differs" means at least one of `employeeId`, `schedDate`, or `sequence` changed. If all three are identical to the most recent entry, the upload is a no-op for that service (idempotent).

This handles the common case where all printed work appears on every daily CSV upload — services that haven't changed don't accumulate duplicate entries.

When a new entry is appended, `createdAt` is set to the current server time (`new Date().toISOString()`). The CSV parser produces `createdAt: ""` as a placeholder; this is always overwritten before persistence.

### Example timeline

| Upload | employeeId | schedDate | Result |
|--------|-----------|-----------|--------|
| Mon AM | 1IB | 2026-09-14 | Appended (first entry) |
| Mon PM | 1IB | 2026-09-14 | **Skipped** (identical to most recent) |
| Tue AM | 1LS | 2026-09-14 | Appended (employee changed) |
| Tue AM | 1LS | 2026-09-16 | Appended (date changed) |

After this sequence, the array has 3 entries — a complete record of every meaningful schedule change.

---

## Read Rules — `AssignmentUtils`

**Source**: `src/app/assignment/AssignmentUtils.ts`

`AssignmentUtils` is the **single source of truth** for interpreting an `AssignmentDoc[]` array. All consumers must use it instead of implementing their own array traversal logic.

```typescript
const utils = new AssignmentUtils(assignments);
```

### `utils.mostRecent`

The most recently uploaded assignment across all dates, determined by `createdAt`. This is the "current" assignment — what the schedule looks like right now.

**Used by**: `hydrateLastAssigned` (to populate `service.lastAssigned`), `ServiceUtils.assignmentOutcome`

### `utils.canonicalForDate(schedDate)`

The canonical assignment for a specific date. When multiple entries exist for the same date (e.g., employee was changed on the same day), the one with the latest `createdAt` is authoritative.

### `utils.canonical`

All canonical assignments — one per `(servId, schedDate)` pair, latest `createdAt` wins. This is the deduplicated view used for completion and reliability calculations.

**Used by**: `assignmentSelect.assignmentsByEmployeeForRange`

### `utils.isDuplicate(incoming)`

Returns `true` if the incoming assignment is identical to the most recent one. Used by the write handler to skip appending unchanged entries.

**Used by**: `csv/api/route.ts`

---

## Consumers

| Consumer | What it uses | Why |
|----------|-------------|-----|
| `csv/api/route.ts` | `isDuplicate` | Skip appending unchanged entries |
| `hydrateLastAssigned.ts` | `mostRecent` | Populate `service.lastAssigned` for scheduling display |
| `ServiceUtils.assignmentOutcome` | `mostRecent` | Determine if a completed service satisfied its assignment |
| `assignmentSelect.assignmentsByEmployeeForRange` | `canonical` | Count assigned services per employee per date for completion % |
| `reliabilitySelect` | `assignmentsByEmployeeForRange` | Detect suspicious zero-completion days |
| `productivitySelect` | `assignmentsByEmployeeForRange` | Compute completion % denominator |

---

## The "Future Re-Plan" Case

A common scenario: you schedule work for Wednesday, then on Tuesday you re-plan Wednesday and upload a new CSV.

With the additive model:
- The original Wednesday assignment (1IB, Wed) is preserved in the array
- The new Wednesday assignment (1LS, Wed) is appended with a later `createdAt`
- `canonicalForDate("2026-09-16")` returns the 1LS entry (latest `createdAt`)
- The 1IB entry is still in the array — it's part of the historical record

This correctly reflects that 1IB was originally planned for Wednesday but the plan changed before Wednesday arrived. The 1IB entry does not count as a "missed" assignment because `canonicalForDate` resolves to 1LS.

---

## Data Integrity Note

Assignments written before this module was refactored (prior to the additive model) may have only one entry per service — the most recent assignment at the time of the last upload. Historical data before that point is not recoverable. Going forward, all uploads are fully preserved.

---

## Files

| File | Purpose |
|------|---------|
| `AssignmentTypes.ts` | `AssignmentDoc`, `AssignmentProps`, `Assignment` types |
| `AssignmentUtils.ts` | Canonical read logic for `AssignmentDoc[]` arrays |
| `AssignmentModel.ts` | *(not present — assignments are stored as subdocuments on `ServiceDocProps`)* |
| `assignmentSlice.ts` | Redux state for `bySchedDate`, `bySchedDateRange`, etc. |
| `assignmentSelect.ts` | Selectors; `assignmentsByEmployeeForRange` uses `AssignmentUtils.canonical` |
| `useAssignments.ts` | Hook for dispatching assignment queries |
| `api/AssignmentContract.ts` | API contract for `getBySchedDate`, `getBySchedDateRange`, etc. |
| `api/route.ts` | API handlers — read-only queries against `ServiceDocPropsModel` |
| `src/app/csv/api/route.ts` | Write handler — `saveAssignments` (append-only with dedup guard) |
