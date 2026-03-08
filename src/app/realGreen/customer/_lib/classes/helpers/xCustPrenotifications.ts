import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { ContactPoint } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";

export type Prenotification = {
  callAhead: CallAhead;
  message: string;
  contactPoints: ContactPoint[];
};

//todo: this is the way.
export function getPrenotifications(
  customer: CustomerUtils,
): Prenotification[] {
  return [];
}
