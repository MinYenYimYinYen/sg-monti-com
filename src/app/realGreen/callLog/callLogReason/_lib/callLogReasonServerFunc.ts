import { extendEntities } from "@/app/realGreen/_lib/extendEntities";
import {
  CallLogReasonCore,
  CallLogReasonDoc,
  CallLogReasonDocProps,
  CallLogReasonRaw,
  remapCallLogReasons,
} from "@/app/realGreen/callLog/callLogReason/CallLogReasonTypes";
import { baseCallLogReasonDocProps } from "@/app/realGreen/callLog/callLogReason/_lib/baseCallLogReason";
import { CallLogReasonDocPropsModel } from "@/app/realGreen/callLog/callLogReason/models/CallLogReasonDocPropsModel";

export { remapCallLogReasons };

export async function extendCallLogReasons(
  cores: CallLogReasonCore[],
): Promise<CallLogReasonDoc[]> {
  return extendEntities<CallLogReasonCore, CallLogReasonDocProps, CallLogReasonDoc>({
    cores,
    model: CallLogReasonDocPropsModel,
    idField: "reasonId",
    baseDocProps: baseCallLogReasonDocProps,
  });
}

export async function fetchAndExtendCallLogReasons(
  raw: CallLogReasonRaw[],
): Promise<CallLogReasonDoc[]> {
  const cores = remapCallLogReasons(raw);
  return extendCallLogReasons(cores);
}
