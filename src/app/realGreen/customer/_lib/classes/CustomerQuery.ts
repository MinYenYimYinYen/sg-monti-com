import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { BaseQuery } from "@/lib/primatives/typeUtils/BaseQuery";

export class CustomerQuery extends BaseQuery<Customer> {
  constructor(customers: Customer[]) {
    super(customers);
  }

  protected createInstance(items: Customer[]): this {
    return new CustomerQuery(items) as this;
  }

  /** Filters to customers that have zero revenue for the given method. Delegates to CustomerUtils.isZeroRevenue. */
  isZeroRevenue(method: "actual" | "renewal") {
    return new CustomerQuery(this.items.filter((c) => c.x.isZeroRevenue(method)));
  }
}
