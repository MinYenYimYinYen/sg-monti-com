"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useCallLog } from "@/app/realGreen/callLog/useCallLog";
import { callLogSelect } from "@/app/realGreen/callLog/callLogSelect";
import { CallLog, CallLogNote } from "@/app/realGreen/callLog/CallLogTypes";

// Replace with a known customer ID from your RealGreen account for testing.
const DEFAULT_CUST_ID = 4073100;

export default function CallLogSandboxPage() {
  const [custId, setCustId] = useState<number>(DEFAULT_CUST_ID);
  const [inputValue, setInputValue] = useState<string>(String(DEFAULT_CUST_ID));

  const { refreshForCustomer } = useCallLog({ custId });

  const callLogCores = useSelector(callLogSelect.callLogCores);
  const callLogs = useSelector(callLogSelect.callLogs);
  const callLogsByCustId = useSelector(callLogSelect.callLogsByCustId);

  const logsForCust = callLogsByCustId.get(custId) ?? [];

  const handleFetch = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed)) {
      setCustId(parsed);
      refreshForCustomer(parsed);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h1 className="text-xl font-bold">CallLog Sandbox</h1>
      <p className="text-sm text-foreground/60">
        Fetches call logs directly from RealGreen for a given customer ID.
        Use this page to validate the data shape and answer open questions
        before designing the sync layer. See <code>callLogSyncPlan.md</code> Section 10.
      </p>

      {/* Customer ID input */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Customer ID</label>
          <input
            type="number"
            className="border rounded p-2 bg-card text-foreground w-40"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          />
        </div>
        <button
          className="rounded bg-primary text-white py-2 px-4 font-medium"
          onClick={handleFetch}
        >
          Fetch Call Logs
        </button>
      </div>

      {/* Summary */}
      <div className="space-y-1 text-sm">
        <div>
          <span className="font-medium">Total cores in state:</span>{" "}
          {callLogCores.length}
        </div>
        <div>
          <span className="font-medium">Total hydrated logs in state:</span>{" "}
          {callLogs.length}
        </div>
        <div>
          <span className="font-medium">
            Logs for custId {custId}:
          </span>{" "}
          {logsForCust.length}
        </div>
      </div>

      {/* Open questions checklist */}
      <div className="border rounded p-4 space-y-2 bg-card">
        <h2 className="font-semibold text-sm">Open Questions to Answer</h2>
        <ol className="list-decimal list-inside text-sm space-y-1 text-foreground/80">
          <li>Does the response match <code>CallLogRaw</code>? Check the raw JSON below.</li>
          <li>Is <code>reason</code> on notes a numeric string like <code>"42"</code> or something else?</li>
          <li>Are notes always present, or is <code>notes?</code> truly optional?</li>
          <li>What are the actual <code>status</code> values on <code>CallLog</code>?</li>
          <li>What is the realistic volume? (logs per customer, total)</li>
        </ol>
      </div>

      {/* Per-log display */}
      {logsForCust.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold">
            Call Logs for Customer {custId} ({logsForCust.length})
          </h2>
          {logsForCust.map((log: CallLog) => (
            <div
              key={log.callLogId}
              className="border rounded p-4 space-y-2 bg-card text-sm"
            >
              <div className="flex gap-4 flex-wrap">
                <span>
                  <span className="font-medium">ID:</span> {log.callLogId}
                </span>
                <span>
                  <span className="font-medium">Status:</span>{" "}
                  <code>{log.status || "(empty)"}</code>
                </span>
                <span>
                  <span className="font-medium">Entered:</span> {log.enterDate}
                </span>
                <span>
                  <span className="font-medium">Due:</span>{" "}
                  {log.dueDate || "(none)"}
                </span>
                <span>
                  <span className="font-medium">Resolved:</span>{" "}
                  {String(log.resolved)}
                </span>
                <span>
                  <span className="font-medium">EnteredBy:</span>{" "}
                  <code>{log.enteredBy || "(empty)"}</code>
                </span>
                <span>
                  <span className="font-medium">AssignedTo:</span>{" "}
                  <code>{log.assignedTo || "(empty)"}</code>
                </span>
              </div>

              {/* Notes */}
              <div>
                <span className="font-medium">
                  Notes ({log.notes.length}):
                </span>
                {log.notes.length === 0 ? (
                  <span className="text-foreground/50 ml-2">(none)</span>
                ) : (
                  <div className="mt-2 space-y-2 pl-4 border-l-2 border-accent/30">
                    {(log.notes as CallLogNote[]).map((note: CallLogNote) => (
                      <div key={note.callLogNoteId} className="space-y-1">
                        <div className="flex gap-3 flex-wrap text-xs text-foreground/70">
                          <span>
                            <span className="font-medium">NoteID:</span>{" "}
                            {note.callLogNoteId}
                          </span>
                          <span>
                            <span className="font-medium">Date:</span>{" "}
                            {note.date || "(empty)"}
                          </span>
                          <span>
                            <span className="font-medium">Reason (raw):</span>{" "}
                            <code>{note.reason || "(empty)"}</code>
                          </span>
                          <span>
                            <span className="font-medium">Reason (resolved):</span>{" "}
                            <code>
                              {note.callLogReason
                                ? `[${note.callLogReason.reasonId}] ${note.callLogReason.reason}`
                                : "(not resolved — callLogReason not loaded)"}
                            </code>
                          </span>
                          <span>
                            <span className="font-medium">Employee:</span>{" "}
                            <code>{note.employeeId || "(empty)"}</code>
                          </span>
                        </div>
                        {note.note && (
                          <div className="text-xs bg-accent/10 rounded p-2">
                            {note.note}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raw JSON dump for shape validation */}
      {logsForCust.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm">
            Raw JSON (first log — for shape validation)
          </h2>
          <pre className="text-xs bg-card border rounded p-4 overflow-auto max-h-96">
            {JSON.stringify(logsForCust[0], null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
