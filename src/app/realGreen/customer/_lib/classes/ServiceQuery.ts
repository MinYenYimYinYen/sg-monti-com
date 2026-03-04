import {
  getServiceStatuses,
  ServiceStatusType,
} from "@/app/realGreen/_lib/subTypes/serviceStatus";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";

export class ServiceQuery {
  constructor(private services: Service[]) {}

  byStatus(...keys: ServiceStatusType[]) {
    const statuses = getServiceStatuses(keys);
    const serviceQuery = new ServiceQuery(
      this.services.filter((s) => statuses.includes(s.status)),
    );
    return serviceQuery;
  }

  byDoneDate(min: string, max: string) {
    const doneServices = typeGuard.definedArray(
      this.services.filter((s) => s.x.doneDate),
    );
    return new ServiceQuery(
      doneServices.filter((s) => s.x.doneDate! >= min && s.x.doneDate! <= max),
    );
  }

  byPriceRange(min: number, max: number) {
    return new ServiceQuery(
      this.services.filter((s) => s.price >= min && s.price <= max),
    );
  }

  isPest(bool: boolean) {
    return new ServiceQuery(this.services.filter((s) => s.x.isPest === bool));
  }

  get results() {
    return this.services;
  }
}
