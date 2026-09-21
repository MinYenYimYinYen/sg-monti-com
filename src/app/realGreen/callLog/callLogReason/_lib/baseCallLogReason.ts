import {
  CallLogReason,
  CallLogReasonCore,
  CallLogReasonDoc,
  CallLogReasonDocProps,
  CallLogReasonProps,
} from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";
import { baseNumId } from "@/app/realGreen/_lib/realGreenConst";

export const baseCallLogReasonCore: CallLogReasonCore = {
  reasonId: baseNumId,
  reason: "",
  status: "",
  contactOrAttempt: "",
  sendNote: false,
  blockLead: false,
};

export const baseCallLogReasonDocProps: CallLogReasonDocProps = {
  reasonId: baseNumId,
  createdAt: "",
  updatedAt: "",
};

export const baseCallLogReasonDoc: CallLogReasonDoc = {
  ...baseCallLogReasonCore,
  ...baseCallLogReasonDocProps,
};

export const baseCallLogReasonProps: CallLogReasonProps = {};

export const baseCallLogReason: CallLogReason = {
  ...baseCallLogReasonDoc,
  ...baseCallLogReasonProps,
};
