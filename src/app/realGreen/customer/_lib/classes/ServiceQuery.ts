import {
  getServiceStatuses,
  ServiceStatusType,
} from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { BaseQuery } from "@/lib/primatives/typeUtils/BaseQuery";

export class ServiceQuery extends BaseQuery<Service> {
  constructor(services: Service[]) {
    super(services);
  }

  byStatus(...keys: ServiceStatusType[]) {
    const statuses = getServiceStatuses(keys);
    const serviceQuery = new ServiceQuery(
      this.items.filter((s) => statuses.includes(s.status)),
    );
    return serviceQuery;
  }

  byDoneDate(min: string, max: string) {
    const doneServices = typeGuard.definedArray(
      this.items.filter((s) => s.x.doneDate),
    );
    return new ServiceQuery(
      doneServices.filter((s) => s.x.doneDate! >= min && s.x.doneDate! <= max),
    );
  }

  byPriceRange(min: number, max: number) {
    return new ServiceQuery(
      this.items.filter((s) => s.price >= min && s.price <= max),
    );
  }

  isPest(bool: boolean) {
    return new ServiceQuery(this.items.filter((s) => s.x.isPest === bool));
  }

  hasPromise(bool: boolean) {
    return new ServiceQuery(
      this.items.filter((s) => s.x.promises.length > 0 === bool),
    );
  }

  isPromised(bool: boolean) {
    return new ServiceQuery(this.items.filter((s) => s.x.isPromisedOrHasPromise === bool));
  }

  protected createInstance(items: Service[]): this {
    return new ServiceQuery(items) as this;
  }
}
