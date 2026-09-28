"use client";

import { useState } from "react";

type SyncStatus = "idle" | "pending" | "success" | "error";

type SyncResult = {
  synced: number;
  lastSyncedAt: string;
};

type EntitySyncState = {
  status: SyncStatus;
  result: SyncResult | null;
  errorMsg: string | null;
  syncType: "full" | "delta" | null;
};

const initialEntityState: EntitySyncState = {
  status: "idle",
  result: null,
  errorMsg: null,
  syncType: null,
};

type Entity = "customer" | "program" | "service";

const ENTITY_CONFIG: Record<
  Entity,
  { label: string; op: string; apiPath: string; note?: string }
> = {
  customer: {
    label: "Customer",
    op: "syncCustomers",
    apiPath: "/realGreen/customer/sync/api",
  },
  program: {
    label: "Program",
    op: "syncPrograms",
    apiPath: "/realGreen/customer/sync/programSync/api",
  },
  service: {
    label: "Service",
    op: "syncServices",
    apiPath: "/realGreen/customer/sync/serviceSync/api",
    note: "Full sync is limited to the last 7 years to control volume.",
  },
};

function EntitySyncPanel({ entity }: { entity: Entity }) {
  const config = ENTITY_CONFIG[entity];
  const [state, setState] = useState<EntitySyncState>(initialEntityState);

  const runSync = async (force: boolean) => {
    setState({ status: "pending", result: null, errorMsg: null, syncType: force ? "full" : "delta" });

    try {
      const res = await fetch(config.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: config.op, ...(force ? { force: true } : {}) }),
      });

      const data = await res.json();

      if (data.success) {
        setState((prev) => ({ ...prev, result: data.payload, status: "success" }));
      } else {
        setState((prev) => ({
          ...prev,
          errorMsg: data.message ?? "Sync failed — check server console for details.",
          status: "error",
        }));
      }
    } catch (e) {
      setState((prev) => ({
        ...prev,
        errorMsg: e instanceof Error ? e.message : "Network error",
        status: "error",
      }));
    }
  };

  const { status, result, errorMsg, syncType } = state;

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-foreground">{config.label} Sync</h2>
        {config.note && (
          <p className="text-xs text-foreground/60 mt-0.5">{config.note}</p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          className="rounded bg-primary text-primary-foreground py-1.5 px-4 text-sm font-medium disabled:opacity-50"
          onClick={() => runSync(true)}
          disabled={status === "pending"}
        >
          Full Sync
        </button>
        <button
          className="rounded bg-accent/20 text-foreground border border-accent/30 py-1.5 px-4 text-sm font-medium disabled:opacity-50"
          onClick={() => runSync(false)}
          disabled={status === "pending"}
        >
          Delta Sync
        </button>
      </div>

      {status === "pending" && (
        <div className="rounded-md border border-border bg-card/50 px-3 py-2 text-sm text-foreground/70">
          <span className="font-semibold text-foreground">
            {syncType === "full" ? "Full sync" : "Delta sync"} running…
          </span>{" "}
          Check the server console for progress.
        </div>
      )}

      {status === "success" && result && (
        <div className="rounded-md border border-accent/30 bg-accent/10 px-3 py-2 space-y-1 text-sm">
          <p className="font-semibold text-foreground">
            ✓ {syncType === "full" ? "Full sync" : "Delta sync"} complete
          </p>
          <p className="text-foreground/70">
            <span className="font-medium text-foreground">Records synced:</span>{" "}
            {result.synced.toLocaleString()}
          </p>
          <p className="text-foreground/70">
            <span className="font-medium text-foreground">lastSyncedAt:</span>{" "}
            <span className="font-mono text-xs">{result.lastSyncedAt}</span>
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm">
          <p className="font-semibold text-destructive">Sync failed</p>
          <p className="text-foreground/70 mt-1">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}

export default function CustomerSyncPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold text-foreground">Customer / Program / Service Sync</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Triggers sync endpoints for each entity. Watch the{" "}
            <span className="font-mono text-foreground/80">dev server console</span> for
            round-by-round algorithm output.
          </p>
        </div>

        <div className="rounded-md bg-accent/10 border border-accent/20 px-4 py-3 text-sm text-foreground/70">
          <span className="font-semibold text-foreground">Console output pattern:</span>
          <pre className="mt-2 text-xs text-foreground/60 whitespace-pre-wrap">
{`[customer sync] Round 0 — batchCount: 1, offsets: [0]
[customer sync] Round 0 — results: [500] — continuing
...
[customer sync] Fetch complete — N API calls, N records fetched
[customer sync] Upsert complete — N records written to MongoDB
[customer sync] Sync complete — N records synced, lastSyncedAt: ...`}
          </pre>
        </div>

        <EntitySyncPanel entity="customer" />
        <EntitySyncPanel entity="program" />
        <EntitySyncPanel entity="service" />
      </div>
    </div>
  );
}
