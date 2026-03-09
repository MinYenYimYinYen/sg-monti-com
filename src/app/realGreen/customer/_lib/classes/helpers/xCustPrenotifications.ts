import { ContactPoint } from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { CustomerUtils } from "@/app/realGreen/customer/_lib/classes/CustomerUtils";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";

export type Prenotification = {
  contactPoints: ContactPoint[];
  services: Service[];
  callAheads: CallAhead[];
};

export function getPrenotifications(
  customerUtils: CustomerUtils,
): Prenotification[] {
  const services = customerUtils.serviceQuery.byStatus("printed").results;
  return services.flatMap((service) => {
    const callAheads = service.x.callAheads;
    return callAheads.flatMap((callAhead) => {
      const contactTypes = callAhead.contactTypes;
      return contactTypes.flatMap((contactType) => {
        const contactPoints = customerUtils.customer.contactPoints.filter(
          (cp) => cp.type === contactType,
        );

        //todo: I'm not sure if this needs to be unique at this point.
        const prenotification: Prenotification = {
          contactPoints,
          services,
          callAheads,
        };
        return prenotification;
      });
    });
  });
}
