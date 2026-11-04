import { QboPurchase, QboPurchaseSummary } from "@/app/qbo/purchase/types/QboPurchaseTypes";

// Shared builders for the purchase helper tests. Entities here are QBO shapes, not RealGreen
// ones, so they are built by hand rather than with generateCustomer.

export function makePurchase(overrides: Partial<QboPurchase> = {}): QboPurchase {
  return {
    Id: "247",
    SyncToken: "0",
    PaymentType: "CreditCard",
    AccountRef: { name: "Visa", value: "42" },
    Line: [
      {
        DetailType: "AccountBasedExpenseLineDetail",
        Amount: 10,
        AccountBasedExpenseLineDetail: {
          AccountRef: { name: "Meals and Entertainment", value: "13" },
        },
      },
    ],
    TxnDate: "2026-10-15",
    TotalAmt: 10,
    ...overrides,
  };
}

export function makeSummary(overrides: Partial<QboPurchaseSummary> = {}): QboPurchaseSummary {
  return {
    Id: "1",
    SyncToken: "0",
    PaymentType: "CreditCard",
    TxnDate: "2026-10-15",
    DocNumber: null,
    PrivateNote: null,
    Credit: false,
    TotalAmt: 10,
    AccountRef: { name: "Visa", value: "42" },
    EntityRef: null,
    Lines: [],
    ...overrides,
  };
}
