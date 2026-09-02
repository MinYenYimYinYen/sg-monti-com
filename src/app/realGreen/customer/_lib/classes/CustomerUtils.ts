import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { ServiceQuery } from "@/app/realGreen/customer/_lib/classes/ServiceQuery";
import { ProgramQuery } from "@/app/realGreen/customer/_lib/classes/ProgramQuery";
import { dateRanges, dateStrings } from "@/lib/primatives/dates/dateStrings";
import { TRange } from "@/lib/primatives/tRange/TRange";
import { FlagRule } from "@/app/flagRule/FlagRuleTypes";
import { evaluateAllRules, FlagRuleResult } from "@/app/flagRule/flagRuleEngine";
import { RenewalFlagIds } from "@/app/globalSettings/_lib/GlobalSettingsTypes";

export class CustomerUtils {
  constructor(
    public readonly customer: Omit<Customer, "x">,
    public readonly renewalFlagIds: RenewalFlagIds | null = null,
  ) {}
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

  /** True when remitBalance exceeds creditLimit, or any balance in due3 or higher is positive. */
  public get isCreditHold(): boolean {
    return this.customer.remitBalance > this.customer.creditLimit || this.customer.aging.isCreditHold;
  }

  /** True when this customer is active, not on hold, not on credit hold, and eligible for scheduling (status "9"). */
  public get isActionable(): boolean {
    return this.customer.status === "9" && !this.isOnHold && !this.isCreditHold;
  }

  /** True when the customer has the autoRenew flag and it is configured in globalSettings. */
  public get isAutoRenew(): boolean {
    if (this.renewalFlagIds === null || this.renewalFlagIds.autoRenew === null) return false;
    return this.customer.flags.some((f) => f.flagId === this.renewalFlagIds!.autoRenew);
  }

  /** True when the customer has the dontAutoRenew flag and it is configured in globalSettings. */
  public get isDontAutoRenew(): boolean {
    if (this.renewalFlagIds === null || this.renewalFlagIds.dontAutoRenew === null) return false;
    return this.customer.flags.some((f) => f.flagId === this.renewalFlagIds!.dontAutoRenew);
  }

  /** True when the customer has the confirmed renewal flag and it is configured in globalSettings. */
  public get isConfirmed(): boolean {
    if (this.renewalFlagIds === null || this.renewalFlagIds.confirmed === null) return false;
    return this.customer.flags.some((f) => f.flagId === this.renewalFlagIds!.confirmed);
  }

  /**
   * True when all programs for the given method have zero revenue.
   *
   * "renewal": a program is zero-revenue when all its renewal-eligible services (status !== "N")
   *            have nextPrice after discounts === 0.
   * "actual":  a program is zero-revenue when all its active/asap/printed/completed services
   *            have price after discounts === 0.
   *
   * Returns false when the customer has no programs.
   */
  public isZeroRevenue(method: "actual" | "renewal"): boolean {
    // Inactive customers are never considered zero-revenue — they're not active accounts. TODO - Delete these two lines - this logic does not belong here.
    // if (this.customer.status !== "9") return false;
    const activePrograms = this.programs.filter((p) => p.status === "9");
    if (activePrograms.length === 0) return false;
    return activePrograms.every((p) => p.x.isZeroRevenue(method));
  }

  /**
   * Evaluates all provided FlagRules against this customer and returns only violations
   * (rules where status is "missing" or "conflict").
   *
   * Builds the flagMap from the customer's already-hydrated flags for present-flag name
   * resolution. Flags referenced by a rule but not on the customer fall back to flagId.toString()
   * in the message — pass a broader flagMap from flagSelect.flagDocMap at the call site if
   * full name resolution for absent flags is needed.
   */
  public flagRuleViolations(rules: FlagRule[]): FlagRuleResult[] {
    const flagMap = new Map(this.customer.flags.map((f) => [f.flagId, f]));
    return evaluateAllRules(this.customer as Customer, rules, flagMap).filter(
      (result) => result.status !== "valid",
    );
  }

}
