import { describe, it, expect } from "vitest";
import { sampleCustomer } from "@/app/realGreen/sampleData/sampleCustomer";
import { samplePrepayConfig } from "@/app/realGreen/sampleData/samplePrepayConfig";
import { sampleUpsellProgCode } from "@/app/realGreen/sampleData/sampleUpsellProgCode";
import {
  getBalanceAdjustment,
  getTotalDue,
} from "@/app/prepayLetters/pricing/balanceAdjustment";
import { getStubTotals } from "@/app/prepayLetters/pricing/stubTotals";

const bothOn = {
  ...samplePrepayConfig,
  showCreditBalance: true,
  showRemitBalance: true,
};
const bothOff = {
  ...samplePrepayConfig,
  showCreditBalance: false,
  showRemitBalance: false,
};

function withBalance(netBalance: number) {
  return { ...sampleCustomer, netBalance };
}

describe("getBalanceAdjustment", () => {
  it("negative balance is a credit when showCreditBalance is on", () => {
    expect(
      getBalanceAdjustment({ customer: withBalance(-25), config: bothOn }),
    ).toEqual({ creditBalance: 25, remitBalance: 0 });
  });

  it("negative balance is ignored when showCreditBalance is off", () => {
    expect(
      getBalanceAdjustment({
        customer: withBalance(-25),
        config: { ...bothOn, showCreditBalance: false },
      }),
    ).toEqual({ creditBalance: 0, remitBalance: 0 });
  });

  it("positive balance is a remit balance when showRemitBalance is on", () => {
    expect(
      getBalanceAdjustment({ customer: withBalance(40), config: bothOn }),
    ).toEqual({ creditBalance: 0, remitBalance: 40 });
  });

  it("positive balance is ignored when showRemitBalance is off", () => {
    expect(
      getBalanceAdjustment({
        customer: withBalance(40),
        config: { ...bothOn, showRemitBalance: false },
      }),
    ).toEqual({ creditBalance: 0, remitBalance: 0 });
  });

  it("zero balance never applies", () => {
    expect(
      getBalanceAdjustment({ customer: withBalance(0), config: bothOn }),
    ).toEqual({ creditBalance: 0, remitBalance: 0 });
  });
});

describe("getTotalDue", () => {
  it("subtracts credit and adds remit", () => {
    expect(
      getTotalDue({
        total: 100,
        balances: { creditBalance: 30, remitBalance: 0 },
      }),
    ).toBe(70);
    expect(
      getTotalDue({
        total: 100,
        balances: { creditBalance: 0, remitBalance: 15 },
      }),
    ).toBe(115);
  });
});

describe("getStubTotals with balances", () => {
  for (const totalsSource of ["current", "upsell"] as const) {
    it(`${totalsSource}: total includes credit and remit, other fields unchanged`, () => {
      const base = getStubTotals({
        customer: withBalance(0),
        config: bothOff,
        upsell: sampleUpsellProgCode,
        totalsSource,
      });
      const credit = getStubTotals({
        customer: withBalance(-10),
        config: bothOn,
        upsell: sampleUpsellProgCode,
        totalsSource,
      });
      const remit = getStubTotals({
        customer: withBalance(10),
        config: bothOn,
        upsell: sampleUpsellProgCode,
        totalsSource,
      });
      expect(credit.total).toBeCloseTo(base.total - 10, 2);
      expect(remit.total).toBeCloseTo(base.total + 10, 2);
      expect(credit.prepayDisc).toBe(base.prepayDisc);
    });
  }
});
