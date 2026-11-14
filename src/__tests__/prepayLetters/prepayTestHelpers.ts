import { makeCustomer, type MakeCustomerSpec } from "@/_builders/makeCustomer";
import { makeDiscount } from "@/_builders/makeDiscount";
import { makePriceTable } from "@/_builders/makePriceTable";
import { makeProgCode } from "@/_builders/makeProgCode";
import { makeTaxCode } from "@/_builders/makeTaxCode";
import { BILLING_TYPE } from "@/app/realGreen/_lib/subTypes/BillingType";
import type { Customer } from "@/app/realGreen/customer/_lib/entities/types/CustomerTypes";
import { DiscountType } from "@/app/realGreen/discount/DiscountTypes";
import type { PriceTable } from "@/app/realGreen/priceTable/_types/PriceTableTypes";
import type { ProgCode } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";

/**
 * A size 15 customer with a 5% customer discount and 7.375% tax, two prepay programs (the
 * first with a 10% program discount) and one installment program. Pass `overrides` to
 * replace any of it.
 */
export function makeLetterCustomer(overrides: MakeCustomerSpec = {}): Customer {
  return makeCustomer({
    core: { size: 15 },
    taxCodes: [makeTaxCode({ taxRate: 7.375 })],
    discount: makeDiscount({
      discountType: DiscountType.PERCENT,
      isPermanent: true,
      amount: 5,
    }),
    programs: [
      {
        progCode: { description: "Lawn Care Program" },
        discount: makeDiscount({ discountType: DiscountType.PERCENT, amount: 10 }),
        services: [{ core: { price: 100 } }, { core: { price: 100 } }],
      },
      {
        progCode: { description: "Mosquito Program" },
        services: [{ core: { price: 50 } }, { core: { price: 50 } }],
      },
      {
        core: { billingType: BILLING_TYPE.Installment },
        progCode: { description: "Tree Care Program" },
        services: [{ core: { price: 240 } }],
      },
    ],
    ...overrides,
  });
}

type MakeFlatPriceTableParams = {
  price: number;
};

/** A single-range price chart: every size up to 20 is priced at `price` per visit. */
export function makeFlatPriceTable({ price }: MakeFlatPriceTableParams): PriceTable {
  return makePriceTable({
    priceTableId: 9001,
    desc: "Flat Price Table",
    maxPrice: 0,
    maxSize: 20,
    ranges: [{ priceId: 1, tableId: 9001, size: 20, price }],
  });
}

type MakeUpsellProgCodeParams = {
  description?: string;
  price?: number;
  /** One entry per service on the upsell program. */
  serviceLongNames?: string[];
};

/** A proposed program priced at `price` per visit for a customer of size 20 or less. */
export function makeUpsellProgCode({
  description = "Upsell Program",
  price = 150,
  serviceLongNames = ["Upsell - First Visit", "Upsell - Second Visit"],
}: MakeUpsellProgCodeParams = {}): ProgCode {
  return makeProgCode({
    progCode: { description, priceTable: makeFlatPriceTable({ price }) },
    servCodes: serviceLongNames.map((longName) => ({ name: longName, longName })),
  });
}
