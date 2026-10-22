import { Program } from "@/app/realGreen/customer/_lib/entities/types/ProgramTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";
import { isEcon } from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";

export class ProgramUtils {
  constructor(private readonly program: Omit<Program, "x">) {}

  public get customer(): Customer {
    return this.program.customer;
  }

  /**
   * True when this program is billed as a monthly installment plan.
   *
   * Service prices on an installment program reflect the total for the plan term,
   * not what the customer sees (a flat monthly amount). Components that display
   * prices should branch on this rather than showing per-service numbers.
   * Unrecognized or empty billing types are treated as not installment.
   */
  public get isInstallment(): boolean {
    return this.program.billingType === BILLING_TYPE.Installment;
  }

  /**
   * True when the customer's card on file is charged automatically after each service.
   * Unrecognized or empty billing types are treated as not autopay.
   */
  public get isAutopay(): boolean {
    return this.program.billingType === BILLING_TYPE.AutoCreditCard;
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
    return this.serviceQuery.byStatus("active", "asap", "printed", "completed")
      .results.length;
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

  public get isOnHold(): boolean {
    // The RealGreen API sometimes returns null for holdStart even when a hold is active.
    // We treat a program as on hold if: holdCodeId is set AND today <= holdEnd.
    if (!this.program.holdCodeId || !this.program.holdEnd) return false;
    const onHold = dateStrings.today() <= this.program.holdEnd;
    return onHold;
  }

  /** True when this program is active (status "9"), not on hold, and its customer is also actionable. */
  public get isActionable(): boolean {
    return (
      this.program.status === "9" &&
      !this.isOnHold &&
      this.program.customer.x.isActionable
    );
  }

  public getServStats(method: "actual" | "renewal") {
    const serviceStatArray = this.services.map((serv) => {
      if (method === "actual") {
        return serv.status;
      } else {
        return serv.status === "N" ? "N" : "Y";
      }
    });
    return serviceStatArray.join("");
  }

  /**
   * True when all eligible services for the given method have zero revenue.
   *
   * "renewal": eligible services are those with status !== "N".
   * "actual":  eligible services are those with active/asap/printed/completed status.
   *
   * Returns false when there are no eligible services (a program with no countable services
   * is not considered zero-revenue — it simply has no revenue to evaluate).
   */
  public isZeroRevenue(method: "actual" | "renewal"): boolean {
    const eligibleServices = this.getEligibleServices(method);
    if (eligibleServices.length === 0) return false;
    return eligibleServices.every((s) => s.x.isZeroRevenue(method));
  }

  /**
   * Total revenue for this program under the given method.
   *
   * "renewal": sum of nextPrice for all services with status !== "N"
   * "actual":  sum of price for services with active/asap/printed/completed status
   */
  public revenue(method: "actual" | "renewal"): number {
    return this.getEligibleServices(method).reduce((sum, service) => {
      return sum + (method === "renewal" ? service.nextPrice : service.price);
    }, 0);
  }

  private getEligibleServices(method: "actual" | "renewal"): Service[] {
    if (method === "renewal") {
      return this.services.filter((s) => s.status !== "N");
    }
    const ACTUAL_STATUSES = ["Y", "*", "$", "S"];
    return this.services.filter((s) => ACTUAL_STATUSES.includes(s.status));
  }

  /**
   * Sum of `getPriceAfterDiscounts` across all services in this program.
   * No status filtering — the caller decides which services to include.
   */
  public getPriceAfterDiscounts(priceKey: "price" | "nextPrice"): number {
    return this.services.reduce((sum, service) => sum + service.x.getPriceAfterDiscounts(priceKey), 0);
  }

  /**
   * Sum of `priceAfterTax` across all services in this program.
   * No status filtering — the caller decides which services to include.
   */
  public priceAfterTax(prepayDiscountPercent: number = 0): number {
    return this.services.reduce((sum, service) => sum + service.x.priceAfterTax(prepayDiscountPercent), 0);
  }

  /**
   * Sum of `prepayDiscountAmt` across all services in this program (positive number).
   * No status filtering — the caller decides which services to include.
   */
  public prepayDiscountAmt(prepayDiscountPercent: number = 0): number {
    return this.services.reduce((sum, service) => sum + service.x.prepayDiscountAmt(prepayDiscountPercent), 0);
  }

  /**
   * Sum of `priceAfterPrepay` across all services in this program.
   * No status filtering — the caller decides which services to include.
   */
  public priceAfterPrepay(prepayDiscountPercent: number = 0): number {
    return this.services.reduce((sum, service) => sum + service.x.priceAfterPrepay(prepayDiscountPercent), 0);
  }

  /**
   * Sum of `taxAmt` across all services in this program.
   * No status filtering — the caller decides which services to include.
   */
  public taxAmt(prepayDiscountPercent: number = 0): number {
    return this.services.reduce((sum, service) => sum + service.x.taxAmt(prepayDiscountPercent), 0);
  }

  /**
   * The most recent doneDate across all completed services in this program.
   * Returns null when no services have been completed.
   *
   * Used by the pace engine's daysSince constraint: a successor service cannot
   * be worked until `daysSince` calendar days have elapsed since this date.
   * Checking the program-level latest doneDate (rather than just the immediately
   * preceding group's service) ensures the constraint is respected regardless of
   * which group in the sequence was most recently completed.
   */
  public get latestDoneDate(): string | null {
    let latest: string | null = null;
    for (const service of this.services) {
      const doneDate = service.production?.doneDate;
      if (!doneDate || doneDate.length < 10) continue;
      if (!latest || doneDate > latest) latest = doneDate;
    }
    return latest;
  }
}
