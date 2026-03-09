import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";
import { ProgramQuery } from "@/app/realGreen/customer/_lib/classes/ProgramQuery";
import { getPrenotifications, Prenotification } from "@/app/realGreen/customer/_lib/classes/helpers/xCustPrenotifications";

export class CustomerUtils {
  constructor(public readonly customer: Omit<Customer, "x">) {}
  public get programs() {
    return this.customer.programs;
  }
  public get services() {
    return this.programs.flatMap((program) => program.services);
  }

  public get serviceQuery(): ServiceQuery {
    return new ServiceQuery(this.services);
  }

  public get programQuery(): ProgramQuery {
    return new ProgramQuery(this.programs);
  }

  public get prenotifications(): Prenotification[] {
    return getPrenotifications(this);
  }
}
