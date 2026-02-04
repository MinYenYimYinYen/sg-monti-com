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

export type CallLogNoteProps = {};

export type CallLogNote = CallLogNoteDoc & CallLogNoteProps;

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

export type CallLogProps = {};

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
