export type CallLogNote = {
  id: number;
  headerID: number;
  date?: string;
  reason?: string;
  note?: string;
  employeeID?: string;
};

export type RemappedCallLogNote = {
  callLogNoteId: number;
  CallLogId: number;
  date: string;
  reason: string;
  note: string;
  employeeId: string;
};

export type RawCallLog = {
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
  notes?: CallLogNote[];
};

export type RemappedCallLog = {
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
  notes: RemappedCallLogNote[];
};

export type CallLog = RemappedCallLog;

export function remapCallLog(raw: RawCallLog): RemappedCallLog {
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

export function remapCallLogNote(raw: CallLogNote): RemappedCallLogNote {
  return {
    callLogNoteId: raw.id,
    CallLogId: raw.headerID,
    date: raw.date || "",
    reason: raw.reason || "",
    note: raw.note || "",
    employeeId: raw.employeeID || "",
  };
}
