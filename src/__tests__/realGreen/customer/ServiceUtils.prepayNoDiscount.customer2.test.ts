import { describe, it, expect } from "vitest";
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/pricing/installmentSegregation";
import type { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";

// ---------------------------------------------------------------------------
// CRM reference data: second no-discount customer, 14 services, 3% prepay (P3).
// Tax codes: S68 State Sales tax 6.875% + SHT Sherburne Transit 0.5% (= 7.375%).
// Source: SA5 Prepay Calculator screenshot (per-service PP Discount / Taxes / Net
// columns and the Total row).
//
// SA5 rounds the tax of EACH tax code separately and then adds them. Rounding the
// combined 7.375% once is a penny off on the 171.90 service:
//   166.74 x 6.875% = 11.4634 -> 11.46     166.74 x 0.5% = 0.8337 -> 0.83
//   per code: 11.46 + 0.83 = 12.29 (CRM)   combined: 166.74 x 7.375% = 12.297 -> 12.30
// ---------------------------------------------------------------------------

const PREPAY_PERCENT = 3;

function makeTaxCode({ taxCodeId, taxRate }: { taxCodeId: string; taxRate: number }): TaxCode {
  return {
    taxCodeId,
    taxRate,
    available: true,
    createdAt: "",
    updatedAt: "",
  };
}

type CrmServiceRow = {
  price: number;
  prepayDisc: number;
  tax: number;
  net: number;
};

const crmRows = {
  fertilizer: { price: 88.55, prepayDisc: 2.66, tax: 6.33, net: 92.22 },
  diseaseControl: { price: 131.95, prepayDisc: 3.96, tax: 9.44, net: 137.43 },
  insectControl: { price: 131.95, prepayDisc: 3.96, tax: 9.44, net: 137.43 },
  lime: { price: 83.95, prepayDisc: 2.52, tax: 6.01, net: 87.44 },
  coreAeration: { price: 171.9, prepayDisc: 5.16, tax: 12.29, net: 179.03 },
} satisfies Record<string, CrmServiceRow>;

/** Rounds away float noise from sums of cent values. */
function toCents(value: number): number {
  return Math.round(value * 100);
}

function buildCustomer() {
  const servicesOf = (count: number, price: number) =>
    Array.from({ length: count }, () => ({ core: { price } }));

  return generateCustomer({
    taxCodes: [
      makeTaxCode({ taxCodeId: "S68", taxRate: 6.875 }),
      makeTaxCode({ taxCodeId: "SHT", taxRate: 0.5 }),
    ],
    programs: [
      { services: servicesOf(6, crmRows.fertilizer.price) },
      { services: servicesOf(4, crmRows.diseaseControl.price) },
      { services: servicesOf(2, crmRows.insectControl.price) },
      { services: servicesOf(1, crmRows.lime.price) },
      { services: servicesOf(1, crmRows.coreAeration.price) },
    ],
  });
}

describe("prepay with no discounts, two tax codes (CRM: 14 services, 3% prepay, 6.875% + 0.5%)", () => {
  const customer = buildCustomer();
  const [fertilizer, diseaseControl, insectControl, lime, coreAeration] =
    customer.programs;

  const rowsByProgram: [typeof fertilizer, CrmServiceRow][] = [
    [fertilizer, crmRows.fertilizer],
    [diseaseControl, crmRows.diseaseControl],
    [insectControl, crmRows.insectControl],
    [lime, crmRows.lime],
    [coreAeration, crmRows.coreAeration],
  ];

  it("builds the 14 services from the CRM screenshot", () => {
    expect(customer.programs.flatMap((program) => program.services)).toHaveLength(14);
  });

  describe.each(rowsByProgram)("per service", (program, row) => {
    it(`$${row.price}: PP discount $${row.prepayDisc}, tax $${row.tax}, net $${row.net}`, () => {
      for (const service of program!.services) {
        expect(service.x.prepayDiscountAmt(PREPAY_PERCENT)).toBe(row.prepayDisc);
        expect(service.x.taxAmt(PREPAY_PERCENT)).toBeCloseTo(row.tax, 2);
        expect(service.x.priceAfterTax(PREPAY_PERCENT)).toBeCloseTo(row.net, 2);
      }
    });
  });

  it("rounds tax per tax code: 166.74 -> 11.46 + 0.83 = 12.29, not 12.30 (CRM: $12.29)", () => {
    const service = coreAeration!.services[0]!;

    expect(service.x.priceAfterPrepay(PREPAY_PERCENT)).toBeCloseTo(166.74, 2);
    expect(toCents(service.x.taxAmt(PREPAY_PERCENT))).toBe(1229);
  });

  it("matches the CRM program subtotals shown on the prepay letter", () => {
    expect(toCents(fertilizer!.x.getPriceAfterDiscounts("price"))).toBe(53130);
    expect(toCents(diseaseControl!.x.getPriceAfterDiscounts("price"))).toBe(52780);
    expect(toCents(insectControl!.x.getPriceAfterDiscounts("price"))).toBe(26390);
  });

  it("matches the CRM grand totals", () => {
    const totals = calculatePrepayTotals({
      programs: getPrepayPrograms(customer),
      prepayPercent: PREPAY_PERCENT,
    });

    expect(toCents(totals.serviceAmt)).toBe(157885);
    expect(toCents(totals.prepayDisc)).toBe(4740);
    expect(toCents(totals.tax)).toBe(11292);
    expect(toCents(totals.total)).toBe(164437);
  });
});
