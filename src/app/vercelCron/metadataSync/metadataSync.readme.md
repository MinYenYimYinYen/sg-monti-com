# Metadata Sync — Vercel Cron (Stub)

## Status: Not Yet Implemented

This folder is a placeholder for a future Vercel Cron job that will sync
slow-changing RealGreen metadata into MongoDB on a fixed schedule (hourly or nightly).

---

## Intended Purpose

Unlike `mirrorSync` (which syncs live entities like customers, programs, services, and call logs
on an activity-based schedule), `metadataSync` is for data that:

- Changes rarely (weekly, monthly, or less)
- Does not need minute-level freshness
- Does not benefit from activity-based scheduling

---

## Candidates

The following RealGreen data types are candidates for `metadataSync`. Each must be evaluated
individually before implementation — the RealGreen API is inconsistent and the sync strategy
will vary.

| Entity | Notes |
|---|---|
| Service codes | Rarely change; needed for display names |
| Program codes | Rarely change; needed for display names |
| Employee data | Changes when staff turns over |
| Zip codes / tax rates | Changes rarely; currently loaded from a static source |
| Flag types | Rarely change |

---

## When to Implement

Implement `metadataSync` when:
1. A metadata entity is needed in the mirror for query performance
2. The entity changes infrequently enough that hourly/nightly sync is acceptable
3. The sync strategy has been determined (see `expandedSyncPlan.md`)

---

## Implementation Pattern

When ready, follow the same pattern as `mirrorSync`:

1. Create `metadataSync/api/route.ts` — a GET handler that validates `CRON_SECRET`
   and calls the appropriate sync functions
2. Add to `vercel.json`:
   ```json
   { "path": "/vercelCron/metadataSync/api", "schedule": "0 * * * *" }
   ```
3. Add `CRON_SECRET` is already set — no new env var needed
4. Document switch points in `expandedSyncPlan.md`

See `mirrorSync/mirrorSync.readme.md` for the full implementation reference.
