import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";
import { ProgramQuery } from "@/app/realGreen/customer/_lib/classes/ProgramQuery";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { TRange } from "@/lib/primatives/tRange/TRange";

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

  public get isOnHold(): boolean {
    const range: TRange<string> = {
      min: this.customer.holdStart ?? "",
      max: this.customer.holdEnd ?? "",
    };
    if (!dateRanges.isValidDateRange(range)) return false;
    const onHold =
      !!this.customer.holdCodeId &&
      dateStrings.isInRange(dateStrings.today(), range);
    return onHold;
  }

  /** True when remitBalance exceeds creditLimit, or due3 is positive. */
  public get isCreditHold(): boolean {
    const onCreditHold =
      this.customer.remitBalance > this.customer.creditLimit || this.customer.due3 > 0;
    return onCreditHold;
  }

  /** True when this customer is active, not on hold, not on credit hold, and eligible for scheduling (status "9"). */
  public get isActionable(): boolean {
    return this.customer.status === "9" && !this.isOnHold && !this.isCreditHold;
  }

}
