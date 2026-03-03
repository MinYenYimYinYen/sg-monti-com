import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";

export class ProgramUtils {
  constructor(private readonly program: Omit<Program, "x">) {}

  public get customer(): Customer {
    return this.program.customer;
  }

  public get services(): Service[] {
    return this.program.services;
  }

  public get serviceQuery(): ServiceQuery {
    return new ServiceQuery(this.services);
  }
}
