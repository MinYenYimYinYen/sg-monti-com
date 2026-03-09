
import { baseCallAheadDocProps } from "@/app/realGreen/callAhead/_lib/baseCallAhead";
import { extendEntities } from "@/app/realGreen/_lib/extendEntities";
import {
  CallAheadCore,
  CallAheadDoc,
  CallAheadDocProps,
  CallAheadRaw,
  NotificationType,
} from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { CallAheadDocPropsModel } from "@/app/realGreen/callAhead/models/CallAheadDocPropsModel";

function remapCallAhead(raw: CallAheadRaw): CallAheadCore {
  // Normalize legacy notification type values from RealGreen API
  let normalizedType = raw.notificationType;
  if (raw.notificationType === "T" as any) normalizedType = NotificationType.Text;
  if (raw.notificationType === "P" as any) normalizedType = NotificationType.Phone;
  if (raw.notificationType === "E" as any) normalizedType = NotificationType.Email;
  if (raw.notificationType === "U" as any) normalizedType = NotificationType.Manual;

  return {
    available: raw.available,
    description: raw.callAheadDescription,
    type: normalizedType,
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
