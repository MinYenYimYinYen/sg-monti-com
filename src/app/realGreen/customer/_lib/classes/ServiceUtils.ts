import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { DoneBy } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { Condition } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { SchedPromise } from "@/app/schedPromise/SchedPromiseTypes";
import { Discount } from "@/app/realGreen/discount/DiscountTypes";
import { applyDiscounts, getPriceChartPrice } from "@/app/realGreen/priceTable/_lib/pricingFuncs";
import { baseStrId } from "@/app/realGreen/_lib/realGreenConst";
import { AssignmentDoc } from "@/app/assignment/AssignmentTypes";

export type ProductRuleCompliance = "pass" | "fail" | "no-rule" | null;

/**
 * Describes how a completed service relates to its planned assignment.
 * Only meaningful when the service has been completed (status === "S").
 */
export type AssignmentOutcome = {
  /** The most recent assignment for this service, if any. */
  assignment: AssignmentDoc | null;
  /**
   * Whether the service was completed by the assigned employee.
   * True when any doneBy.employeeId matches assignment.employeeId.
   */
  completedByAssignedEmployee: boolean;
  /**
   * Whether the service was completed on the scheduled date.
   * True when production.doneDate === assignment.schedDate.
   */
  completedOnScheduledDate: boolean;
  /**
   * True when the service was completed by the assigned employee on the scheduled date.
   * The "clean" case — assignment fully satisfied as planned.
   */
  isFullySatisfied: boolean;
};

export class ServiceUtils {
  constructor(private readonly service: Omit<Service, "x">) {}

  public get customer(): Customer {
    return this.service.program.customer;
  }

  public get doneBys(): DoneBy[] | null {
    return this.service.production?.doneBys || null;
  }

  public get doneDate(): string | null {
    return this.service.production?.doneDate ?? null;
  }

  public get productsUsed(): AppProduct[] | null {
    return this.service.production?.usedAppProducts || null;
  }

  public get conditions(): Condition[] | null {
    const serviceConditions =
      this.service.production?.serviceConditions || null;
    if (serviceConditions) {
      return serviceConditions.map((sc) => sc.condition);
    } else {
      return null;
    }
  }

  public get allTechNotes(): string[] {
    const check = [
      this.service.techNote.length
        ? `Service(${this.service.servCodeId}): ` + this.service.techNote
        : undefined,
      this.service.program.techNote.length
        ? `Program(${this.service.program.progCode.progCodeId}): ` +
          this.service.program.techNote
        : undefined,
      this.service.program.customer.techNote.length
        ? "Customer: " + this.service.program.customer.techNote
        : undefined,
    ];
    return typeGuard.definedArray(check);
  }

  public get techNotes() {
    return {
      servNote: this.service.techNote,
      progNote: this.service.program.techNote,
      custNote: this.service.program.customer.techNote,
    };
  }

  public get callAheads(): CallAhead[] {
    const servCallAhead = this.service.callAhead;
    const progCallAhead = this.service.program.callAhead;
    const custCallAhead = this.service.program.customer.callAhead;
    const callAheads = typeGuard.definedArray([
      servCallAhead,
      progCallAhead,
      custCallAhead,
    ]);
    return callAheads;
  }

  public get hasCallAhead(): boolean {
    return this.callAheads.length > 0;
  }

  public get isPest(): boolean {
    return this.service.program.progCode.programType === "H";
  }

  public get promises(): SchedPromise[] {
    const maybeNull: (SchedPromise | null)[] = [
      this.service.promise,
      this.service.program.promise,
      this.service.program.customer.promise,
    ];
    return typeGuard.definedArray(maybeNull);
  }

  public get isPromisedOrHasPromise(): boolean {
    return this.promises.length > 0 || this.service.isPromised;
  }

  public get promiseDetails() {
    return this.promises.map((promise) => {
      return {
        ...promise,
        isPromised: this.service.isPromised,
      };
    });
  }

  public get isPaperInvoice() {
    const customer = this.customer;
    const hasEmail = customer.email.length > 0;
    const dontEmail = customer.contactPreference.dontEmailInvoice;
    return !hasEmail || dontEmail;
  }

  /**
   * The discounts applicable to this service for pricing purposes.
   * Includes the service-level discount and the program-level discount.
   * Does NOT include the customer-level discount — that is the default
   * applied when a new program is proposed, not to existing services.
   */
  public get applicableDiscounts(): Discount[] {
    return typeGuard.definedArray([
      this.service.discount,
      this.service.program.discount,
    ]);
  }

  /**
   * Checks whether the service used the products required by its servCode's productRules.
   *
   * Rule matching: the first rule whose size condition applies to service.size is used.
   *   "all" → always applies
   *   "lte" → applies when service.size <= rule.size
   *   "gt"  → applies when service.size > rule.size
   *
   * Compliance: ALL expected sub-product IDs (from the applicable rule's productMasters)
   * must appear in usedAppProducts (AND logic). Returns "no-rule" when no rule applies
   * or no expected products are configured.
   */
  public get productRuleCompliance(): ProductRuleCompliance {
    if (this.service.status !== "S") return null;
    const rules = this.service.servCode.productRules;
    if (rules.length === 0) return "no-rule";

    const applicableRule = rules.find((rule) => {
      if (rule.sizeOperator === "all") return true;
      if (rule.sizeOperator === "lte") return this.service.size <= rule.size;
      if (rule.sizeOperator === "gt") return this.service.size > rule.size;
      return false;
    });

    if (!applicableRule) return "no-rule";

    const expectedSubIds = applicableRule.productMasters.flatMap((pm) =>
      pm.subProductConfigs.map((c) => c.subId),
    );
    if (expectedSubIds.length === 0) return "no-rule";

    const usedProductIds = new Set(
      this.service.production?.usedAppProducts
        ?.filter((ap) => ap.productCommon.unit.metric !== "area")
        .map((ap) => ap.productId) ?? [],
    );

    return expectedSubIds.every((id) => usedProductIds.has(id))
      ? "pass"
      : "fail";
  }

  /**
   * Returns the service price after applying all applicable discounts
   * (service-level and program-level).
   *
   * @param priceKey - "price" for the current season price,
   *                   "nextPrice" for the planned next-season price.
   */
  public getPriceAfterDiscounts(priceKey: "price" | "nextPrice"): number {
    return applyDiscounts({
      price: this.service[priceKey],
      discounts: this.applicableDiscounts,
    });
  }

  /**
   * True when this service has zero revenue for the given method.
   *
   * "renewal": service is renewal-eligible (status !== "N") and nextPrice after discounts is 0.
   * "actual":  service has an active/asap/printed/completed status and price after discounts is 0.
   */
  public isZeroRevenue(method: "actual" | "renewal"): boolean {
    if (method === "renewal") {
      return (
        this.service.status !== "N" &&
        this.getPriceAfterDiscounts("nextPrice") === 0
      );
    }
    const ACTUAL_STATUSES = ["Y", "*", "$", "S"];
    return (
      ACTUAL_STATUSES.includes(this.service.status) &&
      this.getPriceAfterDiscounts("price") === 0
    );
  }

  /**
   * True when this service has an active or asap status and its program is actionable.
   * This is the single source of truth for "does this service represent schedulable work?"
   */
  public get isActionable(): boolean {
    const ACTIVE_ASAP = ["Y", "*"];
    return (
      ACTIVE_ASAP.includes(this.service.status) &&
      this.service.program.x.isActionable
    );
  }

  /**
   * Schedule info for printed services (status === "$").
   * Returns null for non-printed services.
   *
   * `hasAssignment` is true when a real assignment record exists (employeeId is not the
   * base placeholder). When false, the schedDate comes from the program's nextDate fallback.
   *
   * Display guidance:
   *   hasAssignment → "LR5 ($ 1LS Tue 8/4 Stop 10)"
   *   !hasAssignment → "LR5 Tue 8/4"
   */
  public get schedInfo(): {
    schedDate: string;
    employeeId: string;
    sequence: number;
    hasAssignment: boolean;
  } | null {
    if (this.service.status !== "$") return null;
    const la = this.service.lastAssigned;
    if (!la.schedDate) return null;
    const hasAssignment =
      la.employeeId !== baseStrId && la.employeeId.length > 0;
    return {
      schedDate: la.schedDate,
      employeeId: la.employeeId,
      sequence: la.sequence,
      hasAssignment,
    };
  }

  public get tempSeq(): number | null {
    if (this.service.status !== "$") return null;
    return this.service.program.tempSeq;
  }

  /**
   * The price table price for this service's nextSize.
   * This is the theoretical acquisition price — what the service should have
   * sold for at the time of sale, before any discounts.
   * Returns null if no price table is configured for this program.
   */
  public get acquisitionPrice(): number | null {
    const priceTable = this.service.program.x.priceTable;
    if (!priceTable) return null;
    return getPriceChartPrice({ size: this.service.nextSize, priceTable });
  }

  /**
   * Describes how this completed service relates to its planned assignment.
   *
   * Uses the most recent assignment in service.assignments (last element).
   * Checks whether the assigned employee completed it and whether it was done
   * on the scheduled date — the two axes of assignment satisfaction.
   *
   * Returns all-false when no assignment exists or the service is not completed.
   */
  public get assignmentOutcome(): AssignmentOutcome {
    const assignments = this.service.assignments;
    const assignment = assignments.length > 0 ? assignments[assignments.length - 1]! : null;

    if (!assignment || this.service.status !== "S") {
      return {
        assignment,
        completedByAssignedEmployee: false,
        completedOnScheduledDate: false,
        isFullySatisfied: false,
      };
    }

    const doneBys = this.service.production?.doneBys ?? [];
    const doneDate = this.service.production?.doneDate ?? "";

    const completedByAssignedEmployee = doneBys.some(
      (doneBy) => doneBy.employeeId === assignment.employeeId,
    );
    const completedOnScheduledDate = doneDate !== "" && doneDate === assignment.schedDate;
    const isFullySatisfied = completedByAssignedEmployee && completedOnScheduledDate;

    return {
      assignment,
      completedByAssignedEmployee,
      completedOnScheduledDate,
      isFullySatisfied,
    };
  }
}
