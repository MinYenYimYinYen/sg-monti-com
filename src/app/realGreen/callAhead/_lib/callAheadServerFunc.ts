import {
  CallAheadCore,
  CallAheadDoc,
  CallAheadDocProps,
  CallAheadRaw,
} from "@/app/realGreen/callAhead/_lib/CallAhead";
import CallAheadModel from "@/app/realGreen/callAhead/models/CallAheadModel";
import { baseCallAheadDocProps } from "@/app/realGreen/callAhead/_lib/baseCallAhead";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";

function remapCallAhead(raw: CallAheadRaw): CallAheadCore {
  return {
    available: raw.available,
    description: raw.callAheadDescription,
    type: raw.notificationType,
    callAheadId: raw.id,
  };
}

export function remapCallAheads(raw: CallAheadRaw[]) {
  return raw.map((raw) => remapCallAhead(raw));
}

export async function extendCallAheads(
  cores: CallAheadCore[],
): Promise<CallAheadDoc[]> {
  return extendEntities<CallAheadCore, CallAheadDocProps, CallAheadDoc>({
    cores,
    model: CallAheadModel,
    idField: "callAheadId",
    baseDocProps: baseCallAheadDocProps,
  });
}
