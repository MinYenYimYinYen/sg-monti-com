import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import {
  CallLog,
  CallLogCore,
  CallLogNote,
  CallLogNoteCore,
} from "@/app/realGreen/callLog/CallLogTypes";

const selectCallLogCores = (state: AppState) => state.callLog.callLogCores;

// CallLogNote is now a direct alias for CallLogNoteCore — no hydration needed.
// The reason field already contains the human-readable string from RealGreen.
function hydrateNote(note: CallLogNoteCore): CallLogNote {
  return note;
}

function hydrateCallLog(core: CallLogCore): CallLog {
  const notes: CallLogNote[] = core.notes.map(hydrateNote);
  return { ...core, notes } as CallLog;
}

const selectCallLogs = createSelector(
  [selectCallLogCores],
  (cores): CallLog[] => cores.map(hydrateCallLog),
);

const selectCallLogMap = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).toUniqueMap((l) => l.callLogId),
);

// Grouped by custId — primary access pattern for customer hydration.
const selectCallLogsByCustId = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).groupBy((l) => l.custId).toMap(),
);

// Grouped by enteredBy employeeId — for employee-centric views.
const selectCallLogsByEnteredBy = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).groupBy((l) => l.enteredBy).toMap(),
);

// Grouped by assignedTo employeeId — for employee-centric views.
const selectCallLogsByAssignedTo = createSelector(
  [selectCallLogs],
  (logs) => new Grouper(logs).groupBy((l) => l.assignedTo).toMap(),
);

export const callLogSelect = {
  callLogCores: selectCallLogCores,
  callLogs: selectCallLogs,
  callLogMap: selectCallLogMap,
  callLogsByCustId: selectCallLogsByCustId,
  callLogsByEnteredBy: selectCallLogsByEnteredBy,
  callLogsByAssignedTo: selectCallLogsByAssignedTo,
};
