import { api } from "@/lib/api/api";
import { DataResponse } from "@/lib/api/types/responses";
import { SyncUtilsContract } from "@/app/syncUtils/api/SyncUtilsContract";

export const SYNC_UTILS_API_PATH = "/syncUtils/api";

export type SyncUtilsOp = "getSyncStatus" | "runDeltaSync" | "startFullSync" | "runFullSyncChunk" | "clearSyncLock";

type OpParams<K extends SyncUtilsOp> = SyncUtilsContract[K]["params"];
type OpPayload<K extends SyncUtilsOp> =
  SyncUtilsContract[K]["result"] extends DataResponse<infer Payload> ? Payload : never;

export type SyncUtilsCallResult<K extends SyncUtilsOp> =
  | { ok: true; payload: OpPayload<K> }
  | { ok: false; message: string };

/**
 * Calls a syncUtils operation and returns failures as data. Sync requests are long-running
 * and expected to fail sometimes (timeouts, held locks), so the page shows the message
 * inline instead of relying on a toast that is easy to miss.
 */
export async function callSyncUtils<K extends SyncUtilsOp>({
  op,
  params,
}: {
  op: K;
  params: OpParams<K>;
}): Promise<SyncUtilsCallResult<K>> {
  try {
    const response = await api<SyncUtilsContract[K]["result"]>(SYNC_UTILS_API_PATH, {
      method: "POST",
      body: { op, ...params },
    });
    if (!response || response.success === false) {
      const message = response && "message" in response ? response.message : "Request failed.";
      return { ok: false, message };
    }
    return { ok: true, payload: (response as DataResponse<OpPayload<K>>).payload };
  } catch (e) {
    // A function killed by the platform timeout returns a non-JSON error page.
    const detail = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      message: `${detail}. If this step timed out, run it again: finished work is kept and the step is retried.`,
    };
  }
}
