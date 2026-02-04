import {
  CallLog,
  CallLogCore,
  CallLogDoc,
  CallLogDocProps,
  CallLogProps,
} from "@/app/realGreen/callLog/CallLog";
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";

export const baseCallLogCore: CallLogCore = {
  callLogId: baseNumId,
  custId: baseNumId,
  enterDate: "",
  dueDate: "",
  resolved: false,
  viewed: false,
  alarmSet: false,
  status: baseStrId,
  enteredBy: baseStrId,
  assignedTo: baseStrId,
  notes: [],
};

export const baseCallLogDocProps: CallLogDocProps = {
  callLogId: baseNumId,
  createdAt: "",
  updatedAt: "",
};

export const baseCallLogDoc: CallLogDoc = {
  ...baseCallLogCore,
  ...baseCallLogDocProps,
};

export const baseCallLogProps: CallLogProps = {};

export const baseCallLog: CallLog = {
  ...baseCallLogDoc,
  ...baseCallLogProps,
};
