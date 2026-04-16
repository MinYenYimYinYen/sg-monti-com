import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";
import { isEcon } from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";

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

  /**
   * Count of services in this program with "active" statuses:
   * active (Y), asap (*), printed ($), completed (S).
   * Used to determine economy vs preferred pricing.
   */
  public get activeServiceCount(): number {
    return this.serviceQuery.byStatus("active", "asap", "printed", "completed").results.length;
  }

  /**
   * True if the economy price table should be used for this program.
   * Economy applies when the program has fewer active services than
   * the progCode's `minForPreferred` threshold.
   */
  public get isEcon(): boolean {
    return isEcon({
      minForPreferred: this.program.progCode.minForPreferred,
      activeServiceCount: this.activeServiceCount,
    });
  }

  /**
   * The price table that should be used for this program's services.
   * Returns the economy table when isEcon is true and one is configured,
   * otherwise returns the preferred table.
   */
  public get priceTable(): PriceTable | null {
    if (this.isEcon && this.program.progCode.econPriceTable !== null) {
      return this.program.progCode.econPriceTable;
    }
    return this.program.progCode.priceTable;
  }
}
