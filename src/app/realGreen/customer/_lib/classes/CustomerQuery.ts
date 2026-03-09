import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { BaseQuery } from "@/lib/primatives/typeUtils/BaseQuery";

export class CustomerQuery extends BaseQuery<Customer> {
  constructor(customers: Customer[]) {
    super(customers);
  }

  protected createInstance(items: Customer[]): this {
    return new CustomerQuery(items) as this;
  }
}