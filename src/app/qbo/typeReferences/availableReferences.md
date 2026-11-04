# QBO Type References: Available Pages

Index of Intuit API reference pages we can pull type definitions from. Intuit's reference is rendered by JavaScript, so agents cannot fetch it. When a module starts, the user opens the page and pastes the documentation, and the types are written from that.

## How types are written

- Types follow Intuit's definitions and PascalCase names (see "Types" in `../planning/qboPlan.md`). No Raw/Core/Doc layering, no remap functions.
- Write out **every documented field**. Comment out the fields we do not use, so the full surface stays visible without re-reading Intuit's documentation. Fields we read, write, or must echo back (`Id`, `SyncToken`) stay uncommented.
- Record the minor version a type module was written against in that module. The pinned version is 75 (`qboConst.minorVersion`), confirmed by the user as the version the reference pages were on.
- Shapes the pages name but do not define (addresses, phone, email, website, name-value, month) were written from sample JSON. They live in `_lib/types/QboContactTypes.ts` and are marked `UNVERIFIED` where a sample did not cover every value.

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
| Vendor | Built (read-only) | C | Types in `vendor/types/QboVendorTypes.ts` (minor version 75), including the `QboVendorCreate` request shape and `QboVendorSummary`, the cut-down shape the browser gets. Full module (loader, contract, route, slice, select, hook). Displayed at `/sandbox/qboTest/vendor`. Not yet run against live QuickBooks. `createVendor` is added in Phase E. |
| Purchase | Built (read-only) | C | Types in `purchase/types/QboPurchaseTypes.ts` (minor version 75), including the create request shapes and `QboPurchaseSummary`, the cut-down shape the browser gets. Intuit has no `Line` page, so `QboPurchaseLine` was written from the page's samples. Fields named but not defined by the page (`LinkedTxn`, `TxnTaxDetail`) are commented out. Full read module, loaded by date range (not on session load). Displayed at `/sandbox/qboTest/purchase`. Not yet run against live QuickBooks. Posting is Phase E. |
| CompanyInfo | Built (smoke test) | B | Types in `companyInfo/types/QboCompanyInfoTypes.ts` (minor version 75). Read with `/companyinfo/{realmId}` for "Test connection" on the connection page. No slice or tab. |
| Preferences | Built (smoke test) | B | Types in `preferences/types/QboPreferencesTypes.ts` (minor version 75). The page leaves each section as a bare `object`, so fields come from its sample. Read with `/preferences`, and only a summary reaches the browser. |
| Batch | Types written | C | Envelope types in `_lib/types/QboCommonTypes.ts`. The success body of a create or update item is not on the page, so it is marked `UNVERIFIED` until the first live write. |
| Faults and error codes | Types written | B | `QboFault`, `QboFaultResponse` and `QboFaultError` in `QboCommonTypes.ts`. Error codes the page lists: 120, 500, 610, 2020, 2170, 2500, 5010, 6000, 6140, 6190, 6210, 6240, 6540. See "Posting behavior" in `../planning/qboPlan.md`. |
| Query operation | Done | B | Envelope is `QueryResponse` with `startPosition`, `maxResults` and the entity array (Vendor and Purchase pages). CompanyInfo and Preferences show a bare object, so they use their Read endpoints. |

## Other pages in the entity list

All blank unless noted.

### Transaction entities
Bill, BillPayment, CreditMemo, CreditCardPayment, Deposit, Estimate, Invoice, JournalEntry, Payment, PurchaseOrder, RecurringTransaction, RefundReceipt, ReimburseCharge, SalesReceipt, TaxPayment, Transfer, VendorCredit, TimeActivity, InventoryAdjustment, ChangeOrder

### List and reference entities
Attachable, Budget, Class, CompanyCurrency, Customer, CustomerType, Department, Employee, Entitlements, Exchangerate, Item, PaymentMethod, TaxClassification, TaxCode, TaxRate, TaxService, TaxAgency, Term

Customer, Employee and Class matter at most as sources of vendor-name collision faults (see Phase E). Their types are not needed for that.

### Operations
- Batch (planned, above)
- ChangeDataCapture: **Not used.** Reference data uses full paginated queries.

### Report entities
None are planned.

AccountListDetail, APAgingDetail, APAgingSummary, ARAgingDetail, ARAgingSummary, BalanceSheet, CashFlow, CustomerBalance, CustomerBalanceDetail, CustomerIncome, GeneralLedger, InventoryValuationDetail, InventoryValuationSummary, JournalReport, ProfitAndLoss, ProfitAndLossDetail, SalesByClassSummary, SalesByCustomer, SalesByDepartment, SalesByProduct, TaxSummary, TransactionList, TransactionListByVendor, TransactionListByCustomer, TransactionListWithSplits, TrialBalance, VendorBalance, VendorBalanceDetail, VendorExpenses

## Pages to locate (not in the entity list)

Needed, but not entity pages. Ask the user to paste them when their turn comes.

Resolved. The faults and error codes page, the Batch page and the entity pages were pasted. The Query operation has no separate page; its envelope comes from the Vendor and Purchase pages. `ReferenceType`, `Line` and `AccountBasedExpenseLineDetail` have no pages of their own, so they were written from samples.