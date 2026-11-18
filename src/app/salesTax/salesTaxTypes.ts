import { Service } from "@/app/realGreen/customer/_lib/entities/types/ServiceTypes";
import { MnTaxType } from "@/app/salesTax/salesTaxMapping/SalesTaxMappingTypes";

/**
 * Sales and tax for a set of completed services, computed from the customer's tax codes (not read
 * from the CRM's recorded tax slots). All amounts are dollars.
 *
 * - `services`: the services behind the totals, as the same `Service` objects the central selector
 *   produced, not copies. The UI reads the count from `services.length`.
 * - `price`: the service price before any discount.
 * - `discountAmt`: service and program discounts.
 * - `ppyDiscAmt`: the prepay discount the CRM recorded in dollars.
 * - `netAfterAllDiscounts`: `price - discountAmt - ppyDiscAmt`, never below 0. This is the taxable base.
 * - `taxAmount`: tax on the net for the tax code(s) the summary covers. Each code is rounded per service.
 */
export type RealGreenTaxSummary = {
  services: Service[];
  price: number;
  discountAmt: number;
  ppyDiscAmt: number;
  netAfterAllDiscounts: number;
  taxAmount: number;
};

/**
 * `byTaxCodeId` lists a service under every tax code its customer has, so the same service can be in
 * several of those summaries and their sales columns cannot be summed. `total` lists each service
 * once, and its `taxAmount` is the tax summed over all codes. `untaxed` holds the services whose
 * customer has no tax code.
 */
export type RealGreenTaxReport = {
  byTaxCodeId: Map<string, RealGreenTaxSummary>;
  total: RealGreenTaxSummary;
  untaxed: RealGreenTaxSummary;
};

/**
 * One line of the Minnesota return. `summary` lists each service once, even when several of its
 * customer's RealGreen tax codes map to this Minnesota type. Its `taxAmount` is not RealGreen's: it
 * is `netAfterAllDiscounts` times the Minnesota type's rate, which is how the state computes it, so
 * the per-service rounding rules of the RealGreen report do not apply.
 *
 * `taxCodeIds` are the RealGreen tax codes whose mapping includes this type.
 */
export type MnTaxLine = {
  mnTaxType: MnTaxType;
  taxCodeIds: string[];
  summary: RealGreenTaxSummary;
};

/**
 * Sales that carry no tax: a RealGreen tax code with a 0% rate and no mapping, or (`taxCodeId`
 * null) customers with no tax code at all. They belong in gross receipts but on no Minnesota line.
 * A service is listed only if it is on no Minnesota line and under no unmapped code.
 */
export type NonTaxableSales = {
  taxCodeId: string | null;
  summary: RealGreenTaxSummary;
};

/** A RealGreen tax code used this month that has no mapping, so its sales are on no Minnesota line. */
export type UnmappedTaxCodeSummary = {
  taxCodeId: string;
  summary: RealGreenTaxSummary;
};

/**
 * The RealGreen report redistributed onto Minnesota tax types through the saved mappings.
 *
 * - `total`: the RealGreen total, every service once, whether or not its tax code is mapped.
 * - `mnTaxAmount`: tax summed over `mnTaxLines`.
 * - `realGreenMappedTaxAmount`: what the RealGreen report computed for the mapped tax codes only,
 *   so it is comparable with `mnTaxAmount`. The two differ by rounding and by any rate mismatch.
 */
export type MnSalesTaxReport = {
  mnTaxLines: MnTaxLine[];
  unmappedTaxCodes: UnmappedTaxCodeSummary[];
  nonTaxableSales: NonTaxableSales[];
  nonTaxableTotal: RealGreenTaxSummary;
  total: RealGreenTaxSummary;
  mnTaxAmount: number;
  realGreenMappedTaxAmount: number;
};
