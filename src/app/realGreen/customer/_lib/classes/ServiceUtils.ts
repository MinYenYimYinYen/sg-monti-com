import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { DoneBy } from "@/app/realGreen/_lib/subTypes/DoneByCore";
import { AppProduct } from "@/app/realGreen/_lib/subTypes/AppProduct";
import { Condition } from "@/app/realGreen/conditionCode/_types/ConditionCodeTypes";
import { typeGuard } from "@/lib/primatives/typeUtils/typeGuard";
import { CallAhead } from "@/app/realGreen/callAhead/_lib/CallAheadTypes";
import { SchedPromise } from "@/app/schedPromise/SchedPromiseTypes";
import { Discount } from "@/app/realGreen/discount/DiscountTypes";
import { applyDiscounts } from "@/app/realGreen/priceTable/_lib/pricingFuncs";

export type ProductRuleCompliance = "pass" | "fail" | "no-rule" | null;

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
}
