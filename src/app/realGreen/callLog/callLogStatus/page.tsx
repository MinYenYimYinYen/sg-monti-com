"use client";

import { useSelector } from "react-redux";
import { useCallLogStatus } from "@/app/realGreen/callLog/callLogStatus/useCallLogStatus";
import { callLogStatusSelect } from "@/app/realGreen/callLog/callLogStatus/callLogStatusSelect";

export default function CallLogStatusPage() {
  useCallLogStatus();

  const callLogStatuses = useSelector(callLogStatusSelect.callLogStatuses);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4 max-w-3xl">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Call Log Status</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure the call log status codes used by RealGreen. Each code maps to a description
            and a resolved flag. Statuses must be entered manually — RealGreen does not expose a
            status API.
          </p>
        </div>

        {callLogStatuses.length === 0 ? (
          <div className="border rounded p-6 bg-card text-center text-sm text-foreground/50">
            No statuses configured yet. Add status entries to map RealGreen status codes to
            descriptions and resolved states.
          </div>
        ) : (
          <div className="border rounded overflow-hidden text-sm">
            <table className="w-full">
              <thead className="bg-accent/10 text-foreground/60 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-2">Code</th>
                  <th className="text-left px-4 py-2">Description</th>
                  <th className="text-left px-4 py-2">Resolved</th>
                  <th className="text-left px-4 py-2">Default</th>
                  <th className="text-left px-4 py-2">Updated</th>
                </tr>
              </thead>
              <tbody>
                {callLogStatuses.map((status) => (
                  <tr
                    key={status.code}
                    className="border-t border-border even:bg-accent/5"
                  >
                    <td className="px-4 py-2 font-mono font-semibold">{status.code}</td>
                    <td className="px-4 py-2">{status.description}</td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          status.resolved
                            ? "text-accent font-semibold"
                            : "text-foreground/40"
                        }
                      >
                        {status.resolved ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <span className={status.isDefault ? "text-primary font-semibold" : "text-foreground/40"}>
                        {status.isDefault ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground/50">
                      {status.updatedAt || "(not set)"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs text-foreground/40">
          CRUD UI (add / edit / delete) coming after call log sync is established.
        </p>
      </div>
    </div>
  );
}
