import { describe, it, expect } from "vitest";
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import {
  calculatePrepayTotals,
  getPrepayPrograms,
} from "@/app/prepayLetters/pricing/installmentSegregation";
import type { TaxCode } from "@/app/realGreen/taxCode/TaxCodeTypes";

// ---------------------------------------------------------------------------
// CRM reference data: one customer with 14 services, no service/program/customer
// discounts, 3% prepay (code P3). Tax codes: S68 State Sales tax 6.875% + HET
// Hen/Transit/MAT 1.4% (= 8.275%). Source: SA5 Prepay Calculator screenshot
// (per-service PP Discount / Taxes / Net columns and the Total row).
//
// The 82.50 service is the interesting one: 82.50 x 3% = 2.475 is an exact
// half-cent tie, and SA5 shows a PP discount of 2.47 (rounds the tie down).
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
  fertilizer: { price: 71.35, prepayDisc: 2.14, tax: 5.73, net: 74.94 },
  diseaseControl: { price: 108.95, prepayDisc: 3.27, tax: 8.75, net: 114.43 },
  insectControl: { price: 108.95, prepayDisc: 3.27, tax: 8.75, net: 114.43 },
  treeInsect: { price: 82.5, prepayDisc: 2.47, tax: 6.62, net: 86.65 },
  coreAeration: { price: 129.95, prepayDisc: 3.9, tax: 10.43, net: 136.48 },
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
      makeTaxCode({ taxCodeId: "HET", taxRate: 1.4 }),
    ],
    programs: [
      { services: servicesOf(6, crmRows.fertilizer.price) },
      { services: servicesOf(4, crmRows.diseaseControl.price) },
      { services: servicesOf(2, crmRows.insectControl.price) },
      { services: servicesOf(1, crmRows.treeInsect.price) },
      { services: servicesOf(1, crmRows.coreAeration.price) },
    ],
  });
}

describe("prepay with no discounts (CRM: 14 services, 3% prepay, 8.275% tax)", () => {
  const customer = buildCustomer();
  const [fertilizer, diseaseControl, insectControl, treeInsect, coreAeration] =
    customer.programs;

  const rowsByProgram: [typeof fertilizer, CrmServiceRow][] = [
    [fertilizer, crmRows.fertilizer],
    [diseaseControl, crmRows.diseaseControl],
    [insectControl, crmRows.insectControl],
    [treeInsect, crmRows.treeInsect],
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

  it("rounds the exact half-cent tie (82.50 x 3% = 2.475) down to 2.47", () => {
    const service = treeInsect!.services[0]!;

    expect(service.x.prepayDiscountAmt(PREPAY_PERCENT)).toBe(2.47);
    expect(service.x.priceAfterPrepay(PREPAY_PERCENT)).toBeCloseTo(80.03, 2);
  });

  it("matches the CRM program subtotals shown on the prepay letter", () => {
    expect(toCents(fertilizer!.x.getPriceAfterDiscounts("price"))).toBe(42810);
    expect(toCents(diseaseControl!.x.getPriceAfterDiscounts("price"))).toBe(43580);
    expect(toCents(insectControl!.x.getPriceAfterDiscounts("price"))).toBe(21790);
  });

  it("matches the CRM grand totals", () => {
    const totals = calculatePrepayTotals({
      programs: getPrepayPrograms(customer),
      prepayPercent: PREPAY_PERCENT,
    });

    expect(toCents(totals.serviceAmt)).toBe(129425);
    expect(toCents(totals.prepayDisc)).toBe(3883);
    expect(toCents(totals.tax)).toBe(10393);
    expect(toCents(totals.total)).toBe(135935);
  });
});
