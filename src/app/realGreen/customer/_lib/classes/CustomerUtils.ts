import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";
import { ProgramQuery } from "@/app/realGreen/customer/_lib/classes/ProgramQuery";

export class CustomerUtils {
  constructor(public readonly customer: Omit<Customer, "x">) {}
  public get programs() {
    return this.customer.programs;
  }
  public get services() {
    return this.programs.flatMap((program) => program.services);
  }

  public get printedServices() {
    return this.serviceQuery.byStatus("printed").results;
  }

  public get hasPrintedServices() {
    return this.printedServices.length > 0;
  }

  public get serviceQuery(): ServiceQuery {
    return new ServiceQuery(this.services);
  }

  public get programQuery(): ProgramQuery {
    return new ProgramQuery(this.programs);
  }
}
