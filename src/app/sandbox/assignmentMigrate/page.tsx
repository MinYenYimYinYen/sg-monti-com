"use client";

import { useState } from "react";

type MigrateStatus = "idle" | "pending" | "success" | "error";

type MigrateResult = {
  migrated: number;
  skipped: number;
};

export default function AssignmentMigratePage() {
  const [status, setStatus] = useState<MigrateStatus>("idle");
  const [result, setResult] = useState<MigrateResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const runMigration = async () => {
    setStatus("pending");
    setResult(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/assignment/migrate/api", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "migrateAssignments" }),
      });

      const data = await res.json();

      if (data.success) {
        setResult(data.payload);
        setStatus("success");
      } else {
        setErrorMsg(data.message ?? "Migration failed — check server console for details.");
        setStatus("error");
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setStatus("error");
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-xl font-bold text-foreground">Assignment Migration</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Migrates embedded assignments from <code>ServiceDocProps</code> collection into the
            standalone <code>Assignment</code> collection. Run this once before switching the
            assignment API to use the new model.
          </p>
        </div>

        <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-foreground/70">
          <span className="font-semibold text-destructive">⚠ One-time operation.</span> Run this
          only once. After confirming the migration succeeded, drop the{" "}
          <code>servicedocprops</code> collection in MongoDB.
        </div>

        <button
          className="rounded bg-primary text-primary-foreground py-2 px-5 font-medium disabled:opacity-50"
          onClick={runMigration}
          disabled={status === "pending" || status === "success"}
        >
          {status === "pending" ? "Migrating…" : "Run Migration"}
        </button>

        {status === "success" && result && (
          <div className="rounded-md border border-accent/30 bg-accent/10 px-4 py-3 space-y-1 text-sm">
            <p className="font-semibold text-foreground">✓ Migration complete</p>
            <p className="text-foreground/70">
              <span className="font-medium text-foreground">Migrated:</span>{" "}
              {result.migrated.toLocaleString()} assignments
            </p>
            <p className="text-foreground/70">
              <span className="font-medium text-foreground">Skipped (errors):</span>{" "}
              {result.skipped.toLocaleString()}
            </p>
            {result.skipped > 0 && (
              <p className="text-destructive text-xs mt-1">
                Some assignments failed — check the server console for details.
              </p>
            )}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
            <p className="font-semibold text-destructive">Migration failed</p>
            <p className="text-foreground/70 mt-1">{errorMsg}</p>
          </div>
        )}
      </div>
    </div>
  );
}
