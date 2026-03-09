import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { BaseQuery } from "@/lib/primatives/typeUtils/BaseQuery";
import { Grouper } from "@/lib/primatives/typeUtils/Grouper";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import {
  ContactPoint,
  ContactType,
} from "@/app/realGreen/_lib/subTypes/PhoneRaw";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";

export class CustomerQuery extends BaseQuery<Customer> {
  constructor(customers: Customer[]) {
    super(customers);
  }

  getPrenotifications() {
    const datePivot = this.items
      .filter((c) => c.x.hasPrintedServices)
      .flatMap((customer) => {
        const printedServices = customer.x.printedServices;
        const printedByDate = new Grouper(printedServices)
          .groupBy((s) => s.lastAssigned.schedDate)
          .summarize((key, services) => {
            return {
              scheduleDate: key,
              customer,
              services,
            };
          });

        return printedByDate;
      });

    const callAheadsByCustomer = new Map<
      Customer,
      {
        callAheads: CallAhead[];
        services: Service[];
        contactPoints: ContactPoint[];
      }
    >();
    datePivot.forEach((date) => {
      const customer = date.customer;
      const services = date.services;
      const callAheads = services.flatMap((s) => s.x.callAheads);

      const contactPointMap = new Map<ContactType, ContactPoint[]>();
      callAheads.forEach((callAhead) => {
        const contactTypes = callAhead.contactTypes;
        contactTypes.forEach((contactType) => {
          const contactPoints = customer.contactPoints.filter(
            (cp) => cp.type === contactType,
          );
          contactPoints.forEach((cp) => {
            contactPointMap.set(contactType, [
              ...contactPointMap.get(contactType)!,
              cp,
            ]);
          });
        });
      });
      const contactPoints = Array.from(contactPointMap.values()).flat();

      callAheadsByCustomer.set(customer, {
        callAheads,
        services,
        contactPoints,
      });
    });

    const customerCallAheads = Array.from(callAheadsByCustomer.keys()).map(
      (customer) => {
        const callAheads = callAheadsByCustomer.get(customer)!.callAheads;
        const services = callAheadsByCustomer.get(customer)!.services;
        const contactPoints = callAheadsByCustomer.get(customer)!.contactPoints;
        return {
          customer,
          callAheads,
          services,
          contactPoints,
        };
      },
    );

    return customerCallAheads;
  }

  protected createInstance(items: Customer[]): this {
    return new CustomerQuery(items) as this;
  }
}
