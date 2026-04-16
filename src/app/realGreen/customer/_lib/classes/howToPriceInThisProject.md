# How to Price in This Project

This document describes the pricing architecture used in this project. It is organized
into two layers: **pure math functions** and **domain-aware helpers** on the `*Utils`
classes.

For the original RealGreen API behavior and algorithm details, see
`howToPriceFromOldProject.md` in this directory.

---

## Architecture Overview

```
Layer 1 — Pure math (no domain knowledge)
  src/app/realGreen/priceTable/_lib/pricingFuncs.ts

Layer 2 — Domain helpers (assemble inputs for Layer 1)
  ProgramUtils  → isEcon, activeServiceCount, priceTable
  ServiceUtils  → applicableDiscounts, getPriceAfterDiscounts
```

---

## Layer 1 — Pure Pricing Functions

**File:** `src/app/realGreen/priceTable/_lib/pricingFuncs.ts`

These functions take typed inputs and return numbers. They have no side effects and
no knowledge of Redux, React, or MongoDB.

---

### `getPriceChartPrice({ size, priceTable }): number | null`

Derives a price from a `PriceTable` for a given property size.

**Size handling:** `size` is always `Math.ceil`'d to the nearest whole number before
lookup. RealGreen's `interpolate` flag is not implemented — this is a pure step function.

**Step-function lookup:** Iterates `priceTable.ranges` in ascending order. Returns the
`price` of the first range whose `size` (upper bound) is ≥ the ceiled service size.

**Overflow:** If the ceiled size exceeds all range upper bounds:
```
price = (ceiledSize - priceTable.maxSize) * priceTable.maxPrice + lastRange.price
```
`priceTable.maxPrice` is the per-unit rate applied above `maxSize`.

**Returns `null`** if `priceTable.ranges` is empty.

**Not implemented:** `interpolate`, `roundCalculatedPrices`, `roundAmount` (see old project doc).

---

### `isEcon({ minForPreferred, activeServiceCount }): boolean`

Determines whether the economy price table should be used instead of the preferred
price table.

- Returns `false` if `minForPreferred` is `null` (preferred pricing always applies).
- Returns `true` if `activeServiceCount < minForPreferred`.

"Active" services are those with statuses from
`getServiceStatuses(["active", "asap", "printed", "completed"])` — i.e., status codes
`Y`, `*`, `$`, `S`. The caller is responsible for computing `activeServiceCount`.

In practice, use `ProgramUtils.isEcon` (Layer 2) which computes this automatically.

---

### `applyDiscount({ price, discount }): number`

Applies a single `Discount` to a price.

- **PERCENT** (`DiscountType.PERCENT = 1`):
  `discountAmt = round(price × (amount / 100) × 100) / 100`
- **DOLLAR** (`DiscountType.DOLLAR = 2`):
  `discountAmt = amount`

Each discount is rounded individually before being applied — this matches SA5 behavior.

If `isSurcharge` is `true`, the amount is **added** to the price instead of subtracted.
Non-surcharge discounts are capped at the price (no negative prices).

---

### `applyDiscounts({ price, discounts }): number`

Applies multiple discounts to a price.

Each discount is rounded individually (per SA5 behavior), then amounts are summed.
Surcharges and discounts are tracked separately:
- Total non-surcharge discount is capped at the price.
- Total surcharge is added after the cap.

---

### `calculateTax({ price, taxCodes, hasDiscount }): number`

Calculates the tax amount for a **single service price**.

Tax is calculated per service — the caller sums results for a program total.

```
effectiveRate = sum(taxCode.taxRate) / 100
rawTax = price × effectiveRate
```

**Asymmetric rounding (matches SA5 behavior):**
- If a discount was applied: `ceil(rawTax × 100) / 100`
- If no discount was applied: `round(rawTax × 100) / 100`

`taxCodes` should be the customer's matched tax codes (from `Customer.taxCodes`,
which are resolved from `Customer.taxIds`). Returns `0` if `taxCodes` is empty.

---

## Layer 2 — Domain Helpers

### `ProgramUtils` additions

**`activeServiceCount: number`**
Count of services in the program with qualifying statuses (active, asap, printed,
completed). Used as input to `isEcon`.

**`isEcon: boolean`**
Calls `pricingFuncs.isEcon` with the program's `progCode.minForPreferred` and
`activeServiceCount`. Returns `true` if economy pricing applies.

**`priceTable: PriceTable | null`**
Returns the correct price table for this program:
- If `isEcon` is `true` and `progCode.econPriceTable` is set → returns `econPriceTable`
- Otherwise → returns `progCode.priceTable`

---

### `ServiceUtils` additions

**`applicableDiscounts: Discount[]`**
The discounts applicable to an existing service:
- `service.discount` (service-level)
- `service.program.discount` (program-level)

Does **not** include `customer.discount` — the customer-level discount is the default
applied when a new program is proposed, not to existing services.

**`getPriceAfterDiscounts(priceKey: "price" | "nextPrice"): number`**
Returns the service price after applying all applicable discounts.

- `"price"` — current season price (use for current-year prepay calculations)
- `"nextPrice"` — planned next-season price (use for upcoming-year calculations)

See `howToPriceFromOldProject.md` for the distinction between `price` and `nextPrice`.

---

## Billing Type Eligibility

Programs with `billingType === "C"` (Installment) are excluded from prepay letter
pricing. These customers are already on a payment plan.

All other billing types (`"A"` Credit Card, `"D"` ACH, `"M"` Statement, `"R"` Regular
Invoice) are eligible.

Check `program.billingType` before including a program in any pricing calculation.

---

## Deferred / Future Work

The following pricing scenarios are **not yet implemented**:

### Proposing a new program for a customer (`CustomerUtils`)
When a customer does not have a program and you want to propose one:
- Input: `ProgCode` + `customer.size`
- Use `customer.discount` as the applicable discount
- Propose all `ServCode`s within the `ProgCode`
- Use `getPriceChartPrice` with the appropriate price table

### Proposing services to a program with inactive services (`ProgramUtils`)
When a program has inactive services and you want to re-price them:
- Use existing `service.price` or `service.nextPrice` as the proposed price
- Edge case: ~1% of programs have services with differing prices — flag these
- Apply `customer.discount` (not service/program discount) for proposed pricing
