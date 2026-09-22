import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import {
  CallLog,
  CallLogCore,
  CallLogNote,
  CallLogNoteCore,
  CallLogProps,
} from "@/app/realGreen/callLog/CallLogTypes";
import { callLogReasonSelect } from "@/app/realGreen/callLog/callLogReason/callLogReasonSelect";
import { CallLogReason } from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";
import { callLogStatusSelect } from "@/app/realGreen/callLog/callLogStatus/callLogStatusSelect";
import { CallLogStatus } from "@/app/realGreen/callLog/callLogStatus/CallLogStatusTypes";

const selectCallLogCores = (state: AppState) => state.callLog.callLogCores;

function hydrateNote(
  note: CallLogNoteCore,
  reasonMap: Map<number, CallLogReason>,
  reasonStringMap: Map<string, CallLogReason>,
): CallLogNote {
  // reason field may be a numeric ID or a string representation — try both maps.
  const reasonId = Number(note.reason);
  const callLogReason: CallLogReason | null =
    reasonMap.get(reasonId) ??
    reasonStringMap.get(note.reason) ??
    null;

  return { ...note, callLogReason };
}

function hydrateCallLog(
  core: CallLogCore,
  reasonMap: Map<number, CallLogReason>,
  reasonStringMap: Map<string, CallLogReason>,
  statusMap: Map<string, CallLogStatus>,
): CallLog {
  const notes: CallLogNote[] = core.notes.map((note) =>
    hydrateNote(note, reasonMap, reasonStringMap),
  );
  const callLogStatus: CallLogStatus | null = statusMap.get(core.status) ?? null;
  const props: CallLogProps = { notes, callLogStatus };
  return { ...core, ...props } as CallLog;
}

const selectCallLogs = createSelector(
  [
    selectCallLogCores,
    callLogReasonSelect.reasonMap,
    callLogReasonSelect.reasonStringMap,
    callLogStatusSelect.statusMap,
  ],
  (cores, reasonMap, reasonStringMap, statusMap): CallLog[] =>
    cores.map((core) => hydrateCallLog(core, reasonMap, reasonStringMap, statusMap)),
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
