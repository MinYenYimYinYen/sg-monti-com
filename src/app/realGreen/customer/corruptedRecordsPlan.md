# Corrupted Records Plan

This document outlines the plan for capturing, persisting, and surfacing data about corrupted RealGreen records encountered during sync operations.

---

## Background

During full sync of services (and potentially programs), RealGreen's API throws `"Nullable object must have a value."` when a paginated fetch encounters a record with corrupted data. The existing `binarySearchCorruptedRecord` function isolates the exact offset of each corrupted record and skips it, allowing the sync to continue.

The number of corrupted records encountered during the initial service sync was significant enough to raise concern about data parity with the CRM. We need a way to identify which records are corrupted so they can be investigated in RealGreen.

---

## Goal

Build a pipeline that:
1. **Captures** neighbor context (the valid records immediately before and after each corrupted record) during sync
2. **Persists** that context to MongoDB
3. **Surfaces** it via a UI so patterns can be identified (e.g., specific customers, programs, seasons, or service codes that consistently produce corrupted records)

---

## What We Know at the Point of Corruption

When `binarySearchCorruptedRecord` isolates a corrupted record, we have access to:
- The **offset** of the corrupted record in the paginated result set
- The **entity type** (`customer`, `program`, `service`) from `searchType`
- The **search criteria** used (season range, updated range, etc.)
- The **records immediately before** the corrupted offset (Phase 2 of the binary search)
- The **records immediately after** the corrupted offset (Phase 4 of the binary search)

From the neighbor records (for services), we can extract:
- `servId` — the service IDs bracketing the gap
- `custId` (`customerNumber` in raw) — likely the same customer if services are ordered by customer
- `progId` (`programID` in raw) — the program IDs

This gives a tight range to search in RealGreen CRM. If services are returned in a consistent order, the corrupted record's IDs will be numerically between the neighbors.

---

## Data Model (Open Questions)

A new MongoDB collection `CorruptedSyncRecord` (or similar) would store one document per corrupted record encountered. Fields to capture:

| Field | Type | Notes |
|---|---|---|
| `entityType` | `"customer" \| "program" \| "service"` | Which sync triggered this |
| `syncedAt` | `string` (ISO 8601) | When the sync ran |
| `offset` | `number` | Offset of the corrupted record in the paginated result |
| `neighborBefore` | `object \| null` | Last valid raw record before the corrupted offset |
| `neighborAfter` | `object \| null` | First valid raw record after the corrupted offset |

**Open questions:**
- Should `neighborBefore` / `neighborAfter` store the full raw record or just the key IDs (`servId`, `custId`, `progId`)?
- Should we deduplicate — i.e., if the same offset is corrupted across multiple syncs, update the existing document rather than inserting a new one?
- What natural key should we use? Offset alone is not stable across syncs (records shift as data changes). A composite of `entityType + syncedAt + offset` may be the best we can do.
- Should we also capture the search criteria that produced the corrupted page, so we can reproduce the error?

---

## Architecture (Sketch)

### 1. Modify `binarySearchCorruptedRecord`

After Phase 2 (before records) and Phase 4 (after records) complete, yield or return the neighbor context alongside the recovered records. The caller (sync func) is responsible for persisting it.

### 2. New Model: `CorruptedSyncRecordModel`

Location: `src/app/realGreen/customer/sync/CorruptedSyncRecordModel.ts`

Stores one document per corrupted record encounter. Natural key TBD (see open questions).

### 3. Persist in Sync Funcs

In `serviceSyncFunc.ts` (and `programSyncFunc.ts`), after `binarySearchCorruptedRecord` yields recovered records, also capture and upsert the neighbor context to `CorruptedSyncRecordModel`.

### 4. Data Module

Follow the standard data module pattern:
- `CorruptedSyncRecordContract.ts`
- `corruptedSyncRecordSlice.ts`
- `corruptedSyncRecordSelect.ts`
- `useCorruptedSyncRecord.ts`

### 5. UI

A sandbox or admin page that:
- Lists all corrupted record encounters grouped by `entityType`
- Shows neighbor IDs so the user can look up the surrounding records in RealGreen CRM
- Allows filtering by `syncedAt`, `entityType`, `custId` (from neighbor)
- Highlights patterns (e.g., same `custId` appearing repeatedly)

---

## Status

| Step | Status |
|---|---|
| Background understanding + plan doc | ✅ Done |
| Resolve open questions (data model, deduplication, key strategy) | ⬜ Not started |
| Modify `binarySearchCorruptedRecord` to yield neighbor context | ⬜ Not started |
| Create `CorruptedSyncRecordModel` | ⬜ Not started |
| Persist neighbor context in sync funcs | ⬜ Not started |
| Data module (contract, slice, selectors, hook) | ⬜ Not started |
| Admin/sandbox UI | ⬜ Not started |

---

## Notes

- The corrupted records are a RealGreen data quality issue, not a bug in this app. The goal is investigation and reporting, not fixing the records (that must be done in RealGreen CRM).
- The live pipeline (`stepFactories.ts`) already handles corrupted records gracefully via `binarySearchCorruptedRecord` and `binarySearchCorruptedId`. The sync pipeline now does the same. This plan adds observability on top of the existing recovery mechanism.
- The `binarySearchCorruptedId` function (used for ID-based batch steps) also encounters corrupted records — it may need the same neighbor context capture if programs are found to have significant corruption.
