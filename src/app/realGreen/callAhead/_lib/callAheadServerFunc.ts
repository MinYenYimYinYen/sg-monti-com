
import { baseCallAheadDocProps } from "@/app/realGreen/callAhead/_lib/baseCallAhead";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";
import {
  CallAheadCore,
  CallAheadDoc,
  CallAheadDocProps,
  CallAheadRaw,
} from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { CallAheadDocPropsModel } from "@/app/realGreen/callAhead/models/CallAheadDocPropsModel";

function remapCallAhead(raw: CallAheadRaw): CallAheadCore {
  return {
    available: raw.available,
    description: raw.callAheadDescription,
    type: raw.notificationType,
    callAheadId: raw.id,
  };
}

export function remapCallAheads(raw: CallAheadRaw[]) {
  return raw.map((raw) => remapCallAhead(raw))
    .filter((core) => core.available)
    .sort((a,b) => a.description.localeCompare(b.description))
}

export async function extendCallAheads(
  cores: CallAheadCore[],
): Promise<CallAheadDoc[]> {
  return extendEntities<CallAheadCore, CallAheadDocProps, CallAheadDoc>({
    cores,
    model: CallAheadDocPropsModel,
    idField: "callAheadId",
    baseDocProps: baseCallAheadDocProps,
  });
}
