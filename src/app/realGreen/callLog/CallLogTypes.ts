import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";

// --- CallLogNote ---

export type CallLogNoteRaw = {
  id: number;
  headerID: number;
  date?: string;
  reason?: string;
  note?: string;
  employeeID?: string;
};

export type CallLogNoteCore = {
  callLogNoteId: number;
  callLogId: number;
  date: string;
  reason: string;
  note: string;
  employeeId: string;
};

export type CallLogNoteDocProps = CreatedUpdated & {
  callLogNoteId: number;
};

export type CallLogNoteDoc = CallLogNoteCore & CallLogNoteDocProps;

export type CallLogNote = CallLogNoteCore;

function remapCallLogNote(raw: CallLogNoteRaw): CallLogNoteCore {
  return {
    callLogNoteId: raw.id,
    callLogId: raw.headerID,
    date: raw.date || "",
    reason: raw.reason || "",
    note: raw.note || "",
    employeeId: raw.employeeID || "",
  };
}

// --- CallLog ---

export type CallLogRaw = {
  id: number;
  customerNumber?: number;
  enterDate: string;
  dueDate?: string;
  resolved: boolean;
  viewed: boolean;
  alarmSet: boolean;
  name?: string;
  company?: string;
  phone?: string;
  status?: string;
  enteredBy?: string;
  assignedTo?: string;
  notes?: CallLogNoteRaw[];
};

export type CallLogCore = {
  callLogId: number;
  custId: number;
  enterDate: string;
  dueDate: string;
  resolved: boolean;
  viewed: boolean;
  alarmSet: boolean;
  status: string;
  enteredBy: string;
  assignedTo: string;
  notes: CallLogNoteCore[];
};

export type CallLogDocProps = CreatedUpdated & {
  callLogId: number;
};

export type CallLogDoc = CallLogCore & CallLogDocProps;

export type CallLogProps = {
  notes: CallLogNote[];
};

export type CallLog = CallLogDoc & CallLogProps;

function remapCallLog(raw: CallLogRaw): CallLogCore {
  return {
    callLogId: raw.id,
    custId: raw.customerNumber || 0,
    enterDate: raw.enterDate,
    dueDate: raw.dueDate || "",
    resolved: raw.resolved,
    viewed: raw.viewed,
    alarmSet: raw.alarmSet,
    status: raw.status || "",
    enteredBy: raw.enteredBy || "",
    assignedTo: raw.assignedTo || "",
    notes: raw.notes ? raw.notes.map(remapCallLogNote) : [],
  };
}

export function remapCallLogs(raw: CallLogRaw[]) {
  return raw.map(remapCallLog);
}

export async function extendCallLogs(
  remapped: CallLogCore[],
): Promise<CallLogDoc[]> {
  const { extendEntities } = await import("@/app/realGreen/_lib/extendEntities");
  return extendEntities<CallLogCore, CallLogDocProps, CallLogDoc>({
    cores: remapped,
    idField: "callLogId",
    baseDocProps: {} as CallLogDocProps,
  });
}

// --- CallLogSearchResultRaw ---
// Shape returned by POST /CallLog/CallLogSearch.
// RealGreen uses PascalCase field names on this endpoint, unlike the GET endpoint
// which uses camelCase. Both endpoints return the same note sub-documents (camelCase).
// Use remapCallLogSearchResults() to convert to CallLogCore[].
// Use remapCallLogs() for the GET /CallLog/Customer/{id} endpoint.

export type CallLogSearchResultRaw = {
  ID: number;
  CustomerNumber?: number;
  EnterDate: string;
  DueDate?: string | null;
  Resolved: boolean;
  Viewed: boolean;
  AlarmSet: boolean;
  Name?: string;
  Company?: string;
  Phone?: string;
  Status?: string;
  EnteredBy?: string;
  AssignedTo?: string;
  notes?: CallLogNoteRaw[];
  CallTopic?: unknown[];
};

function remapCallLogSearchResult(raw: CallLogSearchResultRaw): CallLogCore {
  return {
    callLogId: raw.ID,
    custId: raw.CustomerNumber || 0,
    enterDate: raw.EnterDate,
    dueDate: raw.DueDate || "",
    resolved: raw.Resolved,
    viewed: raw.Viewed,
    alarmSet: raw.AlarmSet,
    status: raw.Status || "",
    enteredBy: raw.EnteredBy || "",
    assignedTo: raw.AssignedTo || "",
    notes: raw.notes ? raw.notes.map(remapCallLogNote) : [],
  };
}

export function remapCallLogSearchResults(raw: CallLogSearchResultRaw[]): CallLogCore[] {
  return raw.map(remapCallLogSearchResult);
}
