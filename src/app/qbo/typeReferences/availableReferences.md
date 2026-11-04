# QBO Type References: Available Pages

Index of Intuit API reference pages we can pull type definitions from. Intuit's reference is rendered by JavaScript, so agents cannot fetch it. When a module starts, the user opens the page and pastes the documentation, and the types are written from that.

## How types are written

- Types follow Intuit's definitions and PascalCase names (see "Types" in `../planning/qboPlan.md`). No Raw/Core/Doc layering, no remap functions.
- Write out **every documented field**. Comment out the fields we do not use, so the full surface stays visible without re-reading Intuit's documentation. Fields we read, write, or must echo back (`Id`, `SyncToken`) stay uncommented.
- Record the minor version a type module was written against in that module. The version to pin is not chosen yet (the reference page showed 75).

## URL pattern

Base: `https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/<entity>`

Confirmed: `.../all-entities/account`. The pattern is assumed (lowercase entity name) for the rest and is unverified. Report pages are listed under "Report entities" in Intuit's sidebar, so their URL segment may differ.

## Status key

- **Planned**: needed by `../planning/qboPlan.md`.
- **Built**: the type module exists.
- **Not used**: decided against.
- Blank: not decided. Most of these matter only if requirements change.

## Planned, in build order

| Entity | Status | Phase | Notes |
|---|---|---|---|
| Account | Built (read-only) | B | First end-to-end slice. Pattern-setter. Types in `account/types/QboAccountTypes.ts`, written against minor version 75. `AccountTypeEnum` was written from memory (not on the pasted page) and checked against live data (285 accounts, all types recognized). Displayed at `/sandbox/qboTest/account`. |
| Vendor | Planned | C | Read now, `createVendor` in Phase E. |
| Purchase | Planned | C | Credit card expense. Likely documents `Line` and `AccountBasedExpenseLineDetail` inline. |
| CompanyInfo | Planned | B | Smoke test on the connection page. |
| Batch | Planned | C | Operation, not an entity. Envelope types for posting (Phase E). |

## Other pages in the entity list

All blank unless noted.

### Transaction entities
Bill, BillPayment, CreditMemo, CreditCardPayment, Deposit, Estimate, Invoice, JournalEntry, Payment, PurchaseOrder, RecurringTransaction, RefundReceipt, ReimburseCharge, SalesReceipt, TaxPayment, Transfer, VendorCredit, TimeActivity, InventoryAdjustment, ChangeOrder

### List and reference entities
Attachable, Budget, Class, CompanyCurrency, Customer, CustomerType, Department, Employee, Entitlements, Exchangerate, Item, PaymentMethod, Preferences, TaxClassification, TaxCode, TaxRate, TaxService, TaxAgency, Term

Customer, Employee and Class matter at most as sources of vendor-name collision faults (see Phase E). Their types are not needed for that.

### Operations
- Batch (planned, above)
- ChangeDataCapture: **Not used.** Reference data uses full paginated queries.

### Report entities
None are planned.

AccountListDetail, APAgingDetail, APAgingSummary, ARAgingDetail, ARAgingSummary, BalanceSheet, CashFlow, CustomerBalance, CustomerBalanceDetail, CustomerIncome, GeneralLedger, InventoryValuationDetail, InventoryValuationSummary, JournalReport, ProfitAndLoss, ProfitAndLossDetail, SalesByClassSummary, SalesByCustomer, SalesByDepartment, SalesByProduct, TaxSummary, TransactionList, TransactionListByVendor, TransactionListByCustomer, TransactionListWithSplits, TrialBalance, VendorBalance, VendorBalanceDetail, VendorExpenses

## Pages to locate (not in the entity list)

Needed, but not entity pages. Ask the user to paste them when their turn comes.

- **Query operation**, including pagination (`STARTPOSITION`, `MAXRESULTS`). Needed for Account (Phase B) and Vendor (Phase C).
- **Faults and error handling.** Needed for `qboHttp` fault parsing (Phase B) and posting (Phase E).
- **Shared types**: `ReferenceType` (the `*Ref` shape), `Line`, `AccountBasedExpenseLineDetail`. Probably documented inside the Purchase page. Confirm before asking for separate pages.