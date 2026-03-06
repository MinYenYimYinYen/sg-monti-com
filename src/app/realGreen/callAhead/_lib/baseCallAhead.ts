
import { baseNumId, baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import {
  CallAhead,
  CallAheadCore,
  CallAheadDoc,
  CallAheadDocProps,
  CallAheadProps,
  NotificationType,
} from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

export const baseCallAheadCore: CallAheadCore = {
  callAheadId: baseNumId,
  type: NotificationType.Manual,
  description: baseStrId,
  available: true,
};
export const baseCallAheadDocProps: CallAheadDocProps = {
  callAheadId: baseNumId,
  keywordIds: [],
  createdAt: "",
  updatedAt: "",
};

export const baseCallAheadDoc: CallAheadDoc = {
  ...baseCallAheadCore,
  ...baseCallAheadDocProps,
};

export const baseCallAheadProps: CallAheadProps = {};

export const baseCallAhead: CallAhead = {
  ...baseCallAheadDoc,
  ...baseCallAheadProps,
};
