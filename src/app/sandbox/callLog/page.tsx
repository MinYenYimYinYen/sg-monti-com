"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useSingleCustomer } from "@/app/realGreen/customer/hooks/useSingleCustomer";
import { singleCustSelect } from "@/app/realGreen/customer/selectors/singleCustSelect";
import { useCallLog } from "@/app/realGreen/callLog/useCallLog";
import { callLogSelect } from "@/app/realGreen/callLog/callLogSelect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/style/components/accordion";
import { CallLog, CallLogNote } from "@/app/realGreen/callLog/CallLogTypes";

export default function CallLogDevPage() {
  const [inputValue, setInputValue] = useState("");
  const [custId, setCustId] = useState<number | null>(null);

  const { lookup } = useSingleCustomer();
  const { refreshForCustomer } = useCallLog({ custId: custId ?? undefined });

  const customer = useSelector(singleCustSelect.customer);
  const callLogsByCustId = useSelector(callLogSelect.callLogsByCustId);

  const callLogs: CallLog[] = custId !== null ? (callLogsByCustId.get(custId) ?? []) : [];

  const handleLoad = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed <= 0) return;
    setCustId(parsed);
    lookup(parsed);
    refreshForCustomer(parsed);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 space-y-4 max-w-4xl">
        <h1 className="text-xl font-bold">CallLog Dev</h1>
        <p className="text-sm text-foreground/60">
          Enter a customer ID to load the customer via <code>useSingleCustomer</code> and fetch
          their call logs from RealGreen. Use this to validate the data shape and confirm customer
          hydration before building the sync layer.
        </p>

        {/* Input + button */}
        <div className="flex gap-3 items-end">
          <div className="space-y-1">
            <label className="block text-sm font-medium">Customer ID</label>
            <input
              type="number"
              className="border rounded p-2 bg-card text-foreground w-40"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLoad()}
              placeholder="e.g. 4073100"
            />
          </div>
          <button
            className="rounded bg-primary text-primary-foreground py-2 px-4 font-medium"
            onClick={handleLoad}
          >
            Load
          </button>
        </div>

        {/* Customer summary */}
        {customer && (
          <div className="border rounded p-4 bg-card space-y-2 text-sm">
            <h2 className="font-semibold">Customer (via singleCustSelect)</h2>
            <div className="flex gap-4 flex-wrap text-foreground/80">
              <span><span className="font-medium">custId:</span> {customer.custId}</span>
              <span><span className="font-medium">Name:</span> {customer.displayName}</span>
              <span><span className="font-medium">Last:</span> {customer.lastName}</span>
              <span><span className="font-medium">Status:</span> <code>{customer.status}</code></span>
            </div>
            <div className="text-foreground/80">
              <span className="font-medium">customer.callLogs.length:</span>{" "}
              <span className={customer.callLogs.length > 0 ? "text-accent font-semibold" : "text-foreground/50"}>
                {customer.callLogs.length}
              </span>
              {customer.callLogs.length === 0 && (
                <span className="ml-2 text-foreground/40 text-xs">
                  (0 = call logs not yet loaded into state, or this customer has none)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Call log count summary */}
        {custId !== null && (
          <div className="text-sm text-foreground/70">
            <span className="font-medium">Call logs from callLogSelect for custId {custId}:</span>{" "}
            <span className="font-semibold text-foreground">{callLogs.length}</span>
          </div>
        )}

        {/* Accordion — one item per call log */}
        {callLogs.length > 0 && (
          <Accordion type="multiple" className="space-y-2">
            {callLogs.map((log: CallLog) => (
              <AccordionItem
                key={log.callLogId}
                value={String(log.callLogId)}
                className="border rounded bg-card"
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex gap-4 flex-wrap text-sm text-left">
                    <span><span className="font-medium">ID:</span> {log.callLogId}</span>
                    <span><span className="font-medium">Entered:</span> {log.enterDate}</span>
                    <span>
                      <span className="font-medium">Status:</span>{" "}
                      <code className="text-xs">{log.status || "(empty)"}</code>
                    </span>
                    <span>
                      <span className="font-medium">By:</span>{" "}
                      <code className="text-xs">{log.enteredBy || "(empty)"}</code>
                    </span>
                    <span>
                      <span className="font-medium">Assigned:</span>{" "}
                      <code className="text-xs">{log.assignedTo || "(empty)"}</code>
                    </span>
                    <span>
                      <span className="font-medium">Resolved:</span> {String(log.resolved)}
                    </span>
                    <span className="font-semibold text-accent">
                      {log.notes.length} {log.notes.length === 1 ? "note" : "notes"}
                    </span>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-4 pb-4 space-y-4">
                  {/* All remaining call log fields */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-foreground/80 border-b pb-3">
                    <div><span className="font-medium">callLogId:</span> {log.callLogId}</div>
                    <div><span className="font-medium">custId:</span> {log.custId}</div>
                    <div><span className="font-medium">enterDate:</span> {log.enterDate}</div>
                    <div><span className="font-medium">dueDate:</span> {log.dueDate || "(empty)"}</div>
                    <div><span className="font-medium">resolved:</span> {String(log.resolved)}</div>
                    <div><span className="font-medium">viewed:</span> {String(log.viewed)}</div>
                    <div><span className="font-medium">alarmSet:</span> {String(log.alarmSet)}</div>
                    <div><span className="font-medium">status:</span> <code>{log.status || "(empty)"}</code></div>
                    <div><span className="font-medium">enteredBy:</span> <code>{log.enteredBy || "(empty)"}</code></div>
                    <div><span className="font-medium">assignedTo:</span> <code>{log.assignedTo || "(empty)"}</code></div>
                    {"createdAt" in log && (
                      <div><span className="font-medium">createdAt:</span> {(log as CallLog & { createdAt?: string }).createdAt ?? "(n/a)"}</div>
                    )}
                    {"updatedAt" in log && (
                      <div><span className="font-medium">updatedAt:</span> {(log as CallLog & { updatedAt?: string }).updatedAt ?? "(n/a)"}</div>
                    )}
                  </div>

                  {/* Notes */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground/60 uppercase tracking-wide">
                      Notes ({log.notes.length})
                    </h3>
                    {log.notes.length === 0 ? (
                      <p className="text-xs text-foreground/40">(no notes)</p>
                    ) : (
                      log.notes.map((note: CallLogNote) => (
                        <div
                          key={note.callLogNoteId}
                          className="border rounded p-3 bg-accent/10 space-y-2 text-xs"
                        >
                          <div className="flex gap-4 flex-wrap text-foreground/70">
                            <span><span className="font-medium">noteId:</span> {note.callLogNoteId}</span>
                            <span><span className="font-medium">callLogId:</span> {note.callLogId}</span>
                            <span><span className="font-medium">date:</span> {note.date || "(empty)"}</span>
                            <span>
                              <span className="font-medium">employeeId:</span>{" "}
                              <code>{note.employeeId || "(empty)"}</code>
                            </span>
                          </div>
                          <div className="flex gap-4 flex-wrap text-foreground/70">
                            <span>
                              <span className="font-medium">reason:</span>{" "}
                              <code>{note.reason || "(empty)"}</code>
                            </span>
                          </div>
                          {note.note && (
                            <div className="bg-card rounded p-2 text-foreground/90 whitespace-pre-wrap">
                              {note.note}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}

        {/* Empty state */}
        {custId !== null && callLogs.length === 0 && (
          <p className="text-sm text-foreground/40">
            No call logs loaded yet for custId {custId}. Check that the fetch completed.
          </p>
        )}

        {custId === null && (
          <p className="text-sm text-foreground/40">Enter a customer ID and click Load.</p>
        )}
      </div>
    </div>
  );
}
