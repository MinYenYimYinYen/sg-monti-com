"use client";

import { useEffect, useState } from "react";
import { SyncGroup } from "@/app/realGreen/syncLock/syncGroups";
import { FullSyncRun, SyncGroupStatus } from "@/app/realGreen/syncLock/SyncLockTypes";
import { DeltaSyncOutcome } from "@/app/syncUtils/api/SyncUtilsContract";
import { callSyncUtils } from "@/app/syncUtils/_lib/syncUtilsApi";
import { getRemainingChunks } from "@/app/syncUtils/_lib/syncUtilsLogic";

export type SyncBusyState = "idle" | "delta" | "full";

export type StartFullSyncResult = { ok: true } | { ok: false; message: string };

/**
 * State and actions for one sync group's page. Local state on purpose: this is an
 * admin utility whose progress must not survive navigation, and nothing else reads it.
 *
 * The full sync is driven from here, one request per step, so no single request has to
 * outlast the function time limit. Progress itself is persisted server-side, so a closed
 * tab leaves a resumable run rather than a lost one.
 */
export function useSyncGroup(group: SyncGroup) {
  const [status, setStatus] = useState<SyncGroupStatus | null>(null);
  const [busy, setBusy] = useState<SyncBusyState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deltaOutcome, setDeltaOutcome] = useState<DeltaSyncOutcome | null>(null);
  const [liveRun, setLiveRun] = useState<FullSyncRun | null>(null);

  async function refresh() {
    const result = await callSyncUtils({ op: "getSyncStatus", params: { group } });
    if (result.ok) {
      setStatus(result.payload);
      setLiveRun(result.payload.fullRun);
    } else {
      setErrorMessage(result.message);
    }
  }

  useEffect(() => {
    let cancelled = false;
    callSyncUtils({ op: "getSyncStatus", params: { group } }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setStatus(result.payload);
        setLiveRun(result.payload.fullRun);
      } else {
        setErrorMessage(result.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [group]);

  async function driveRun(initialRun: FullSyncRun) {
    setBusy("full");
    setErrorMessage(null);
    let run = initialRun;
    try {
      for (const chunk of getRemainingChunks(initialRun)) {
        const result = await callSyncUtils({
          op: "runFullSyncChunk",
          params: { group, chunkKey: chunk.key },
        });
        if (!result.ok) {
          setErrorMessage(`${chunk.label}: ${result.message}`);
          break;
        }
        run = result.payload;
        setLiveRun(run);
      }
    } finally {
      setBusy("idle");
      await refresh();
    }
  }

  async function runDelta() {
    setBusy("delta");
    setErrorMessage(null);
    setDeltaOutcome(null);
    const result = await callSyncUtils({ op: "runDeltaSync", params: { group } });
    if (result.ok) {
      setDeltaOutcome(result.payload);
    } else {
      setErrorMessage(result.message);
    }
    setBusy("idle");
    await refresh();
  }

  /** Verifies the password and wipes on the server, then continues loading in the background. */
  async function startFull(password: string): Promise<StartFullSyncResult> {
    setErrorMessage(null);
    setDeltaOutcome(null);
    const result = await callSyncUtils({ op: "startFullSync", params: { group, password } });
    if (!result.ok) {
      await refresh();
      return { ok: false, message: result.message };
    }
    setLiveRun(result.payload);
    void driveRun(result.payload);
    return { ok: true };
  }

  async function resumeFull() {
    if (!liveRun) return;
    await driveRun(liveRun);
  }

  async function clearLock(abandonRun: boolean) {
    setErrorMessage(null);
    const result = await callSyncUtils({ op: "clearSyncLock", params: { group, abandonRun } });
    if (!result.ok) setErrorMessage(result.message);
    await refresh();
  }

  return {
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
  };
}
