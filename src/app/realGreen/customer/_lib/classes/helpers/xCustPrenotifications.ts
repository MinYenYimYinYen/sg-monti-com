import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { ContactPoint } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";

export type Prenotification = {
  schedDate: string;
  callAhead: CallAhead;
  message: string;
  contactPoints: ContactPoint[];
};

export function getPrenotifications(
  customerUtils: CustomerUtils,
): Prenotification[] {
  const printedServices =
    customerUtils.serviceQuery.byStatus("printed").results;
  const bySchedDate = new Grouper(printedServices)
    .groupBy((s) => s.lastAssigned.schedDate)
    .toArray();

  return bySchedDate.flatMap((date) => {
    const services = date.items;
    return services.flatMap((service) => {
      const callAheads = service.x.callAheads;
      return callAheads.flatMap((callAhead) => {
        const contactTypes = callAhead.contactTypes;
        return contactTypes.flatMap((contactType) => {
          const contactPoints = customerUtils.customer.contactPoints.filter(
            (cp) => cp.type === contactType,
          );

          const prenotification: Prenotification = {
            schedDate: date.key,
            callAhead,
            message: `Call ahead for ${service.servCode.longName} on ${date.key}`,
            contactPoints,
          };
          return prenotification;
        });
      });
    });
  });
}
