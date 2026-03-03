import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { DoneBy } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";

export class ServiceUtils {
  constructor(private readonly service: Omit<Service, "x">) {}

  public get customer(): Customer {
    return this.service.program.customer;
  }

  public get doneBys(): DoneBy[] | null {
    return this.service.production?.doneBys || null;
  }

  public get doneDate(): string | null {
    const timeRange = this.service.production?.timeRange || null;
    return timeRange?.max || null;
  }

  public get productsUsed(): AppProduct[] | null {
    return this.service.production?.usedAppProducts || null;
  }
}
