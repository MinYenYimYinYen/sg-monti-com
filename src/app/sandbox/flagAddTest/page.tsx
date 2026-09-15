"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { useFlag } from "@/app/realGreen/flag/useFlag";
import { useEmployee } from "@/app/realGreen/employee/useEmployee";
import { flagSelect } from "@/app/realGreen/flag/_selectors/flagSelect";
import { employeeSelect } from "@/app/realGreen/employee/employeeSelect";
import { useAppDispatch } from "@/lib/hooks/redux";
import { custFlagActions } from "@/app/realGreen/custFlag/_lib/custFlagSlice";

// Hard-coded test customer numbers
const MY_CUST_ID = 4073100;
const FORREST_CUST_ID = 3835113;

export default function FlagAddTestPage() {
  useFlag({ autoLoad: true });
  useEmployee({ autoLoad: true });

  const dispatch = useAppDispatch();
  const flagDocs = useSelector(flagSelect.flagDocs);
  const employees = useSelector(employeeSelect.employees);

  const [selectedFlagId, setSelectedFlagId] = useState<number | null>(null);

  const handleSingle = () => {
    if (selectedFlagId === null) {
      console.warn("[FlagAddTest] No flag selected");
      return;
    }
    console.log("[FlagAddTest] Dispatching single add:", {
      custIds: [MY_CUST_ID],
      flagId: selectedFlagId,
    });
    dispatch(
      custFlagActions.addCustFlag({
        params: { custIds: [MY_CUST_ID], flagId: selectedFlagId },
        config: { loadingMsg: "Adding flag (single)..." },
      }),
    );
  };

  const handleMulti = () => {
    if (selectedFlagId === null) {
      console.warn("[FlagAddTest] No flag selected");
      return;
    }
    console.log("[FlagAddTest] Dispatching multi add:", {
      custIds: [MY_CUST_ID, FORREST_CUST_ID],
      flagId: selectedFlagId,
    });
    dispatch(
      custFlagActions.addCustFlag({
        params: {
          custIds: [MY_CUST_ID, FORREST_CUST_ID],
          flagId: selectedFlagId,
        },
        config: { loadingMsg: "Adding flag (multi)..." },
      }),
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-xl">
      <h1 className="text-xl font-bold">Flag Add Test</h1>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Select Flag</label>
        <select
          className="w-full border rounded p-2 bg-card text-foreground"
          value={selectedFlagId ?? ""}
          onChange={(e) =>
            setSelectedFlagId(e.target.value ? Number(e.target.value) : null)
          }
        >
          <option value="">-- pick a flag --</option>
          {flagDocs.map((f) => (
            <option key={f.flagId} value={f.flagId}>
              [{f.flagId}] {f.desc}
            </option>
          ))}
        </select>
      </div>

      {/* Employee list — loaded for future use, displayed for reference */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground/60">
          Employees loaded ({employees.length}) — for future use
        </label>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-foreground/60">
          <span className="font-medium">Single:</span> custId {MY_CUST_ID} (my account)
        </div>
        <button
          className="w-full rounded bg-primary text-white py-2 px-4 font-medium disabled:opacity-40"
          disabled={selectedFlagId === null}
          onClick={handleSingle}
        >
          Test Single Add (my account)
        </button>

        <div className="text-sm text-foreground/60">
          <span className="font-medium">Multi:</span> custIds {MY_CUST_ID} + {FORREST_CUST_ID} (my + Forrest)
        </div>
        <button
          className="w-full rounded bg-primary text-white py-2 px-4 font-medium disabled:opacity-40"
          disabled={selectedFlagId === null}
          onClick={handleMulti}
        >
          Test Multi Add (my + Forrest)
        </button>

        <div className="text-sm text-foreground/60">
          <span className="font-medium">Invalid:</span> custId -1 only — expect false or error?
        </div>
        <button
          className="w-full rounded bg-destructive text-white py-2 px-4 font-medium disabled:opacity-40"
          disabled={selectedFlagId === null}
          onClick={() => {
            if (selectedFlagId === null) return;
            console.log("[FlagAddTest] Dispatching invalid custId (-1):", { custIds: [-1], flagId: selectedFlagId });
            dispatch(custFlagActions.addCustFlag({ params: { custIds: [-1], flagId: selectedFlagId }, config: { loadingMsg: "Adding flag (invalid)..." } }));
          }}
        >
          Test Invalid custId (-1 only)
        </button>

        <div className="text-sm text-foreground/60">
          <span className="font-medium">Mixed:</span> custIds -1 + {MY_CUST_ID} — partial success or all-or-nothing?
        </div>
        <button
          className="w-full rounded bg-destructive text-white py-2 px-4 font-medium disabled:opacity-40"
          disabled={selectedFlagId === null}
          onClick={() => {
            if (selectedFlagId === null) return;
            console.log("[FlagAddTest] Dispatching mixed (-1 + my account):", { custIds: [-1, MY_CUST_ID], flagId: selectedFlagId });
            dispatch(custFlagActions.addCustFlag({ params: { custIds: [-1, MY_CUST_ID], flagId: selectedFlagId }, config: { loadingMsg: "Adding flag (mixed)..." } }));
          }}
        >
          Test Mixed (-1 + my account)
        </button>
      </div>

      <p className="text-xs text-foreground/40">
        Check browser console for <code>[addCustFlag.fulfilled]</code> and server
        logs for <code>[addCustFlag] RG raw response</code>.
      </p>
    </div>
  );
}
