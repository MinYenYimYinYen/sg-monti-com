# Step 7 runbook: renamed products-used key, full sync

Status: the code is written (2026-11-27). Nothing is deployed. This file is the run order. It is
not read for context; 05_FullStateSandboxSetup.md is the full state.

## What changed in code
- Stored key `productionCore.usedAppProductCores` is now `productionCore.productsUsedCores`
  (`ServiceModel.ts`, `serviceServerFunc.ts`, `Production.ts`).
- Hydrated property `production.usedAppProducts` is now `production.productsUsed`
  (`hydrateProduction.ts`, `completedServiceProductionFallback.ts`, bizPlan selectors).
- Types: `AppProductRaw`, `AppProductCore`, `AppProduct`, `AppProductProps` are now
  `ProductionProductRaw`, `ProductionProductCore`, `ProductionProduct`, `ProductionProductProps`.
  The file is `realGreen/_lib/subTypes/ProductionProduct.ts`. `remapAppProducts` is now
  `remapProductionProducts`.
- bizPlan: `EnrichedAppProduct` is now `ServiceProductUsage`, and the `enrichedAppProducts`
  property on the usage types is now `serviceProductUsages`.
- Unchanged on purpose: `ServiceUtils.productsUsed` (the getter) and RealGreen's raw
  `productsUsed` field. The getter now reads `production.productsUsed`.

## Why a full sync is needed
Mirror reads do not apply schema defaults. A completed service stored with the old key has no
`productsUsedCores`, so `hydrateProduction` fails on it (`.map` of undefined). Every sync of a
completed service rewrites `productionCore` whole, so a full sync replaces the old key everywhere.
There is no fallback that reads the old key and no guard for a missing key (decided).

## Order
1. Sandbox first, with the renamed code.
   - Make sure `.env.local` points at the sandbox, and restart the dev server.
   - Optionally refresh it: run `backup.ps1`, then `resetSandbox.ps1`.
   - Expected before the sync: any screen that loads completed services fails.
   - Run the full sync from `/syncUtils` (password-gated, chunked). Expected after: those screens
     load. Check the bizPlan products page (actual and mixed views), the cover sheet PDF history
     section (products used per past service) and the productivity pages.
2. Take a fresh production backup: `backup.ps1`.
3. Choose a time outside working hours. While the full sync runs, mirror queries are refused with
   a 409, so nobody should need the mirror then.
4. Deploy the renamed code to production.
5. Start the full sync from `/syncUtils` at once. Between the deploy and the end of the sync,
   screens that load completed services from the mirror fail.
6. When it finishes, open the same screens as in step 1 on production.

## Never
- Never run any sync (delta, re-sync, full, or the cron) from the renamed code against the
  production database before production has the renamed code deployed. Each completed service it
  wrote would lose the old key, and the old deployed code would fail on it.
- Local development pointed at production counts as running a sync from the renamed code: the dev
  server does not run the cron, but `/syncUtils` and any query with `syncFirst` do. Point at the
  sandbox until the deploy is done.

## If something goes wrong
- The full sync stops part way: run it again; every write is an idempotent upsert. Until it
  completes, the mirror stays refused (409).
- The deploy has to be undone: the old code cannot read services that already carry only the new
  key. Finish the full sync from the renamed code, or restore the mirror collections from the
  backup taken in step 2 (collections `customers`, `programs`, `services`) and redeploy the old
  code. Restoring touches production data, so it is Luke's call.
