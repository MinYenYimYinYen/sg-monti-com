# Assignment Module — Code Review & Iteration History

This document summarizes the architectural journey taken during the assignments refactor in branch `1.13.0-01-assignments-refactor`. It is intended to orient a new agent picking up where this conversation left off.

---

## Root Cause of the Problem

The refactor started with the goal of moving `assignments: AssignmentDoc[]` out of `ServiceDocProps` (MongoDB) and into a standalone `AssignmentModel`. However, **critical work had already been done in branch `1.10.2-Fix-time-card`** that was never merged into the current branch. That prior work included:

- `AssignmentDoc.createdAt: string` — a timestamp field required for canonical ordering
- `AssignmentUtils` class — the single source of truth for reading the historical array
- An append-only write rule with `isDuplicate` deduplication guard
- Updated `assignmentSelect.assignmentsByEmployeeForRange` using `AssignmentUtils.canonical`
- Updated `reliabilitySelect` with a planned-off-dates filter for suspicious zero-day detection

Because these changes were not present in the starting branch, the refactor initially proceeded with an incorrect understanding of the data model — treating assignments as a simple flat array with one entry per service, rather than an append-only historical log.

---

## Iteration 1 — Initial Refactor (Flat `AssignmentDoc[]` State)

**What we built:**
- New `AssignmentModel` with `unique: true` on `servId` — one document per service
- `assignmentSlice` state: `docs: AssignmentDoc[]` (flat array, upserted by `servId`)
- API handlers returning flat `AssignmentDoc[]`
- `saveAssignments` using `updateOne + $set` (replace, not append)
- `hydrateLastAssigned` using `AssignmentUtils.mostRecent` on the flat docs

**The problem discovered:**
The `AssignmentDoc` type was missing `createdAt`. The `AssignmentUtils` class didn't exist. The `unique: true` constraint on `servId` destroyed the historical log — each CSV upload would replace the previous assignment rather than appending a new entry. This was architecturally wrong.

---

## Iteration 2 — Discovery of Lost Work

During review, the user noted that assignments were meant to be **additive** — an append-only historical log where each meaningful schedule change produces a new entry. The `AssignmentUtils` class from `1.10.2-Fix-time-card` was the source of truth for reading this log.

We retrieved the lost code from git:
```
git show 73a345a:src/app/assignment/AssignmentUtils.ts
git show 73a345a:src/app/assignment/assignment.readme.md
git show 73a345a:src/app/assignment/AssignmentTypes.ts
```

Key findings:
- `AssignmentDoc` needs `createdAt: string` (ISO timestamp, set server-side)
- `AssignmentUtils` provides `mostRecent`, `canonical`, `canonicalForDate`, `isDuplicate`
- The write rule: append only if `isDuplicate` returns false
- `canonical` = one entry per `(servId, schedDate)` pair, latest `createdAt` wins

---

## Iteration 3 — Architectural Debate: MongoDB Shape

**Question:** Should `AssignmentModel` store one document per assignment entry (flat), or one document per service with an embedded `assignments: AssignmentDoc[]` array?

**Decision:** Embedded array shape — `{ servId: number, assignments: AssignmentDoc[] }` — one document per service.

**Rationale:**
- Atomic reads: one query by `servId` gives the full history
- Atomic writes: `$push` is atomic; the `isDuplicate` check reads the same document
- Efficient for the primary access pattern: `find({ servId: { $in: [...] } })`
- Mirrors the old `ServiceDocProps` shape (which already had this structure)

**State shape stays flat:** The Redux slice holds `docs: ServiceAssignmentDoc[]` (array of `{ servId, assignments[] }`). The API flattens nothing — it returns `ServiceAssignmentDoc[]` directly. Selectors derive maps and canonical views from the array.

---

## Iteration 4 — `ServiceProps.assignments: AssignmentUtils` (Final Architecture)

**The key architectural shift:** Instead of `ServiceProps.lastAssigned: Assignment` (a single hydrated assignment), `ServiceProps` now holds `assignments: AssignmentUtils` — the full utility class wrapping the service's assignment history.

**Why this is better:**
- Forces all consumers to use `AssignmentUtils` — no raw array access, no `lastAssigned` shortcut
- `service.assignments.mostRecent` for current schedule display
- `service.assignments.canonical` for completion metrics
- `service.assignments.canonicalForDate(date)` for date-specific queries
- The class is the only way in — impossible to accidentally bypass it

**What changed in `ServiceTypes.ts`:**
```typescript
// Before
lastAssigned: Assignment;

// After
assignments: AssignmentUtils;
```

**`hydrateLastAssigned.ts`** was emptied — it's no longer needed. `centralSelectors.ts` now hydrates `assignments: new AssignmentUtils(serviceAssignmentDoc?.assignments ?? [])` directly from `assignmentSelect.byServId`.

---

## Final Architecture Summary

### MongoDB
```typescript
// One document per service
type ServiceAssignmentDoc = {
  servId: number;           // unique index
  assignments: AssignmentDoc[];  // append-only historical log
};

type AssignmentDoc = {
  servId: number;
  employeeId: string;
  schedDate: string;
  status: string;
  sequence: number;
  createdAt: string;  // ISO timestamp, set server-side
};
```

### Redux State
```typescript
type AssignmentState = {
  docs: ServiceAssignmentDoc[];  // array, upserted by servId
  availableDates: string[];
};
```

### API Contract
All read handlers return `ServiceAssignmentDoc[]` (full document with history). The client uses `AssignmentUtils` to interpret the history.

### Write Rule
`saveAssignments` appends a new entry only if `AssignmentUtils.isDuplicate` returns false. `createdAt` is set server-side at write time.

### `ServiceProps`
```typescript
assignments: AssignmentUtils;  // replaces lastAssigned: Assignment
```

### Key Selectors
- `assignmentSelect.byServId` — `Map<number, ServiceAssignmentDoc>` for O(1) lookup
- `assignmentSelect.techsForDate(date)` — canonical techs for a date
- `assignmentSelect.servIdsForDate(date)` — canonical servIds for a date
- `assignmentSelect.servIdsByEmployeeAndSchedDate(emp, date)` — for feedbackSelect
- `assignmentSelect.assignmentsByEmployeeForRange(range)` — canonical assignments grouped by employee

### `ServiceUtils` getters updated
- `schedInfo` — reads `service.assignments.mostRecent`
- `assignmentOutcome` — reads `service.assignments.mostRecent`

---

## What Still Needs to Be Done (Next Conversation)

### Migration
1. Drop the old `Assignment` collection (flat per-document shape from Iteration 1)
2. Run the migration at `/sandbox/assignmentMigrate` — reads `ServiceDocProps.assignments` arrays and writes them as `{ servId, assignments: [...] }` documents
3. Verify migration counts
4. After merging to master: re-run migration to catch any assignments written during the interim window
5. Drop `servicedocprops` collection

### Downstream consumers still needing `useAssignments` calls
The following features load service data but don't yet call `useAssignments` to populate `service.assignments`:

| Feature | Deps Hook | Status |
|---------|-----------|--------|
| Cover Sheets | `useCoverSheetDeps` | ✅ Added |
| Prenotify | `usePrenotify` | ✅ Added |
| Daily Inventory (loadout page) | `useLoadoutPageDeps` | ✅ Uses `getBySchedDate` |
| Daily Inventory (feedback) | `useLoadoutFeedbackDeps` | ✅ Uses `getBySchedDate` |
| Productivity | `useProductivity` | ✅ Uses `getBySchedDateRange` |
| PaceCrawler | `usePaceCrawlerDeps` | ✅ Uses `useAssignments({ servIds })` |
| Loadout Report | `useLoadoutReportDeps` | ❓ Not checked |
| Customer Value | unknown | ❓ Not checked |
| BizPlan / Season Plan | unknown | ❓ Not checked |
| Sanity checks | unknown | ❓ Not checked |

Any feature that renders `service.assignments.mostRecent` or `service.x.schedInfo` without loading assignments will show empty/base data. The pattern is: call `useAssignments({ servIds: serviceDocs.map(s => s.servId) })` in the feature's deps hook.

### Reliability select semantic gap
`reliabilitySelect` currently queries assignments by `schedDate` range, but what it really needs is "services that had a valid scheduling attempt." A TODO comment was added in `reliabilitySelect.ts`. This is a future improvement.

### `assignment.readme.md` updates
The readme was written to reflect the final architecture. It should be reviewed after the migration is confirmed working.

---

## Files Changed in This Refactor

| File | Change |
|------|--------|
| `AssignmentTypes.ts` | Added `createdAt`, added `ServiceAssignmentDoc` type |
| `AssignmentUtils.ts` | New file — ported from `1.10.2-Fix-time-card` |
| `AssignmentModel.ts` | `{ servId, assignments: AssignmentDoc[] }` shape |
| `assignment/api/AssignmentContract.ts` | All reads return `ServiceAssignmentDoc[]` |
| `assignment/api/route.ts` | Append-only write, full-doc reads |
| `assignmentSlice.ts` | State is `ServiceAssignmentDoc[]`, upsert by servId |
| `assignmentSelect.ts` | All selectors use `AssignmentUtils` internally |
| `useAssignments.ts` | `{ servIds }` option, `saveAssignments` write function |
| `ServiceTypes.ts` | `lastAssigned: Assignment` → `assignments: AssignmentUtils` |
| `baseService.ts` | `baseAssignmentUtils = new AssignmentUtils([])` |
| `centralSelectors.ts` | Hydrates `assignments: new AssignmentUtils(...)` from store |
| `hydrateLastAssigned.ts` | Emptied (no longer needed) |
| `ServiceUtils.ts` | `schedInfo`, `assignmentOutcome` use `assignments.mostRecent` |
| `ServiceDocPropsModel.ts` | Removed `assignments` field from schema |
| `csv/api/route.ts` | Stub (saveAssignments moved to assignment/api/route.ts) |
| `csv/_lib/useCSV.ts` | Calls `useAssignments().saveAssignments()` |
| `feedbackSelect.ts` | Uses `service.assignments.canonicalForDate(routeDate)` |
| `employeeLookbackUtils.ts` | Uses `service.assignments.canonical` and `mostRecent` |
| `productivitySelect.ts` | Inline canonical-by-range logic |
| `reliabilitySelect.ts` | Inline canonical-by-range logic + planned-off-dates filter |
| `paceCrawlerSelect.ts` | Uses `service.assignments.mostRecent` |
| `paceCrawlerLookbackSelect.ts` | Uses `service.assignments.mostRecent` |
| `employeeCardSelect.ts` | Uses `service.assignments.mostRecent` |
| `loadoutSelect.ts` | Flattens `ServiceAssignmentDoc[]` for date filter |
| `loadoutStartSelect.ts` | Canonical logic from `assignmentSelect.docs` |
| `coverSheetsSelect.ts` | Uses `service.x.schedInfo` |
| `prenotifySelect.ts` | Uses `service.x.schedInfo` |
| `PromiseDisplay.tsx` | Uses `service.x.schedInfo` |
| `PrenotifyByType.tsx` | Uses `service.x.schedInfo` |
| `EtaSetupPanel.tsx` | Uses `employeeId` key from map |
| `coverSheets/[routeDate]/page.tsx` | Uses `service.x.schedInfo` and `assignments.mostRecent` |
| `migrate/api/route.ts` | One-time migration from `ServiceDocProps` |
| `sandbox/assignmentMigrate/page.tsx` | Sandbox UI for migration |
| `assignment.readme.md` | Full documentation of the module |
