import { NextRequest, NextResponse } from "next/server";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { SyncMetadataModel } from "@/app/realGreen/syncMetadata/SyncMetadataModel";
import { runDeltaSync } from "@/app/realGreen/customer/sync/runDeltaSync";
import { shouldSync } from "@/app/vercelCron/customerSync/syncSchedule";

// ---------------------------------------------------------------------------
// Vercel Cron — Customer Mirror Sync
// ---------------------------------------------------------------------------

/**
 * Called by Vercel Cron every minute (configured in vercel.json).
 *
 * On each tick:
 * 1. Validates the CRON_SECRET authorization header (Vercel sets this automatically).
 * 2. Reads `lastQueriedAt` from the customer SyncMetadata document.
 * 3. Computes `sinceLastQueryMs` and calls `shouldSync()` to determine the tier.
 * 4. If sync is due: runs `runDeltaSync()` and returns the result.
 * 5. If not due: returns immediately with a "skipped" response (fast path, no DB writes).
 *
 * Tier schedule (see syncSchedule.ts):
 *   0–5 min since last query  → sync every minute
 *   5–60 min since last query → sync every 5 min
 *   >60 min since last query  → sync every 30 min
 *
 * The first query of the day writes `lastQueriedAt`, and the next cron tick
 * (within 60 seconds) will sync — solving the "stale at 6am" problem.
 *
 * Environment variable required:
 *   CRON_SECRET — set in Vercel project settings → Environment Variables.
 *   Vercel automatically sends this as `Authorization: Bearer <CRON_SECRET>`
 *   on every cron invocation.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  // Validate cron secret — reject unauthorized callers
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = Date.now();

  try {
    await connectToMongoDB();

    // Read lastQueriedAt from the customer SyncMetadata document
    const doc = await SyncMetadataModel.findOne({ entityType: "customer" }).lean();
    const lastQueriedAt = doc?.lastQueriedAt;

    const sinceLastQueryMs = lastQueriedAt
      ? now - new Date(lastQueriedAt).getTime()
      : Infinity;

    const sinceLastQueryMin = isFinite(sinceLastQueryMs)
      ? Math.floor(sinceLastQueryMs / 60_000)
      : null;

    if (!shouldSync(sinceLastQueryMs, now)) {
      console.log(
        `[cron:customerSync] Skipped — sinceLastQuery: ${sinceLastQueryMin ?? "never"} min`,
      );
      return NextResponse.json({
        synced: false,
        sinceLastQueryMin,
        reason: "not due per tier schedule",
      });
    }

    console.log(
      `[cron:customerSync] Syncing — sinceLastQuery: ${sinceLastQueryMin ?? "never"} min`,
    );

    const syncStart = Date.now();
    await runDeltaSync();
    const syncMs = Date.now() - syncStart;

    console.log(`[cron:customerSync] Sync complete in ${syncMs}ms`);

    return NextResponse.json({
      synced: true,
      syncMs,
      sinceLastQueryMin,
    });
  } catch (e) {
    console.error("[cron:customerSync] Error:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unknown error" },
      { status: 500 },
    );
  }
}
