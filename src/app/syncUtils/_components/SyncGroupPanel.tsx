"use client";

import { useState } from "react";
import { Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/style/components/button";
import { ENTITY_LABELS, GROUP_LABELS, SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { useSyncGroup } from "@/app/syncUtils/_lib/useSyncGroup";
import { isWipeComplete, formatDuration } from "@/app/syncUtils/_lib/syncUtilsLogic";
import { FullSyncDialog } from "@/app/syncUtils/_components/FullSyncDialog";
import { FullSyncChecklist } from "@/app/syncUtils/_components/FullSyncChecklist";

type SyncGroupPanelProps = {
  group: SyncGroup;
  title: string;
};

/**
 * Sync controls for one group. A lock without an active run (a request that died) is shown
 * with a clear button; an unfinished full sync offers Resume and Abandon.
 */
export function SyncGroupPanel({ group, title }: SyncGroupPanelProps) {
  const {
    status,
    busy,
    errorMessage,
    deltaOutcome,
    liveRun,
    runDelta,
    startFull,
    resumeFull,
    clearLock,
    refresh,
  } = useSyncGroup(group);
  const [dialogOpen, setDialogOpen] = useState(false);

  const isBusy = busy !== "idle";
  const lock = status?.lock ?? null;
  const lockedElsewhere = !isBusy && lock?.isActive === true;
  const staleLock = !isBusy && lock !== null && !lock.isActive;
  const unfinishedRun = liveRun !== null && !isBusy;
  const runStarted = liveRun !== null && isWipeComplete(liveRun);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl space-y-5 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-foreground/60">
              Delta sync fetches only changes since the last checkpoint. Full sync deletes the mirrored{" "}
              {GROUP_LABELS[group]} and reloads everything, which also removes records deleted in RealGreen.
            </p>
          </div>
          <Button variant="outline" intensity="ghost" size="sm" onClick={refresh} disabled={isBusy}>
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        {/* Collection status */}
        <div className="rounded-md border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-foreground/50">
                <th className="px-4 py-2 font-medium">Collection</th>
                <th className="px-4 py-2 text-right font-medium">Documents</th>
                <th className="px-4 py-2 font-medium">Last synced at</th>
                <th className="px-4 py-2 text-right font-medium">Last batch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(status?.entities ?? []).map((entity) => (
                <tr key={entity.entityType}>
                  <td className="px-4 py-1.5 text-foreground">{ENTITY_LABELS[entity.entityType]}</td>
                  <td className="px-4 py-1.5 text-right text-foreground">
                    {entity.documentCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-1.5 font-mono text-xs text-foreground/70">
                    {entity.lastSyncedAt ?? "never (next sync does a full load)"}
                  </td>
                  <td className="px-4 py-1.5 text-right text-foreground/70">
                    {entity.lastSyncCount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {!status && (
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-foreground/50">
                    Loading...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Lock notices */}
        {lockedElsewhere && lock && (
          <div className="rounded-md border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-foreground/80">
            A {lock.operation} sync is running (started{" "}
            <span className="font-mono text-xs">{lock.lockedAt}</span>). Controls are disabled until it finishes.
          </div>
        )}
        {staleLock && lock && (
          <div className="flex items-center justify-between gap-3 rounded-md border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-foreground/80">
            <span>
              A {lock.operation} sync lock expired at <span className="font-mono text-xs">{lock.expiresAt}</span>{" "}
              without finishing, so the request probably died. New syncs can take over automatically.
            </span>
            <Button variant="outline" intensity="ghost" size="sm" onClick={() => clearLock(false)}>
              Clear lock
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="primary"
            intensity="solid"
            onClick={runDelta}
            disabled={isBusy || lockedElsewhere || liveRun !== null}
          >
            {busy === "delta" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Delta sync running...
              </>
            ) : (
              "Run Delta Sync"
            )}
          </Button>
          <Button
            variant="destructive"
            intensity="soft"
            onClick={() => setDialogOpen(true)}
            disabled={isBusy || lockedElsewhere || liveRun !== null}
          >
            Full Sync...
          </Button>
        </div>
        {liveRun !== null && !isBusy && (
          <p className="text-xs text-foreground/50">
            Delta and new full syncs are paused until the unfinished full sync below is resumed or abandoned.
          </p>
        )}

        {/* Errors stay inline: a long sync can finish long after a toast is gone. */}
        {errorMessage && (
          <div className="flex gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <TriangleAlert className="h-5 w-5 shrink-0 text-destructive" />
            <div>
              <p className="font-semibold text-destructive">Sync problem</p>
              <p className="mt-1 text-foreground/80">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Delta result */}
        {deltaOutcome && (
          <div
            className={
              deltaOutcome.skipped
                ? "rounded-md border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm"
                : "rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm"
            }
          >
            {deltaOutcome.skipped ? (
              <p className="text-foreground/80">Delta sync skipped: {deltaOutcome.reason}</p>
            ) : (
              <div className="space-y-1">
                <p className="font-semibold text-foreground">
                  Delta sync complete in {formatDuration(deltaOutcome.durationMs ?? 0)}
                </p>
                {deltaOutcome.syncedCounts.map((count) => (
                  <p key={count.entityType} className="text-foreground/70">
                    {ENTITY_LABELS[count.entityType]}: {count.synced.toLocaleString()} fetched
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Full sync progress and recovery */}
        {liveRun && <FullSyncChecklist run={liveRun} />}
        {unfinishedRun && (
          <div className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm">
            <span className="flex-1 text-foreground/80">
              {runStarted
                ? "This full sync is unfinished. Mirror queries stay disabled until it completes."
                : "The last full sync did not clear the mirror. Nothing was deleted."}
            </span>
            {runStarted && (
              <Button variant="primary" intensity="solid" size="sm" onClick={resumeFull} disabled={lockedElsewhere}>
                Resume
              </Button>
            )}
            <Button variant="outline" intensity="ghost" size="sm" onClick={() => clearLock(true)}>
              Abandon run
            </Button>
          </div>
        )}
      </div>

      <FullSyncDialog
        key={String(dialogOpen)}
        group={group}
        open={dialogOpen}
        onOpenChangeAction={setDialogOpen}
        onConfirmAction={startFull}
      />
    </div>
  );
}
