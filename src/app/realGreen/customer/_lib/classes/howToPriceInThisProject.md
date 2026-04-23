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
  ProgCodeUtils  → theoretical pricing (price chart, no real services yet)
  ServiceUtils   → real service pricing (actual price + discounts + prepay + tax)
```

`pricingFuncs.ts` is a permanent fixture. All functions take primitive inputs and
return numbers. They have no side effects and no knowledge of Redux, React, or MongoDB.
Everything above it assembles the right inputs and delegates down.

**Critical rounding rule:** Per-service rounding must happen at the individual service
level before multiplying by `servCount`. Computing on the program total first produces
a different (wrong) result. This matches SA5 behavior. All Layer 1 functions operate
on a **single service price** — callers multiply by `servCount` for program totals.

---

## Layer 1 — Pure Pricing Functions

**File:** `src/app/realGreen/priceTable/_lib/pricingFuncs.ts`

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

### `calculatePrepayDiscAmt({ servPrice, prepayPercent }): number`

Calculates the prepay discount amount for a **single service price**.

```
discountAmt = round(servPrice × (prepayPercent / 100) × 100) / 100
```

`prepayPercent` is a percentage value (e.g. `5` for 5%).

Rounded per-service — callers multiply by `servCount` to get the program total.
This matches SA5 behavior: `round($69.95 × 5%) × 6 = $3.50 × 6 = $21.00`, not
`round($419.70 × 5%) = $20.99`.

---

### `calculateTaxAmt({ servPrice, prepayDiscAmt, taxRate }): number`

Calculates the tax amount for a **single service** after the prepay discount.

Tax is applied to the post-prepay price:
```
postPrepayPrice = servPrice - prepayDiscAmt
taxAmt = calculateTax({ price: postPrepayPrice, taxRate, hasDiscount: false })
```

`hasDiscount: false` because this function models **theoretical price-chart pricing**
where no service/program discounts exist yet. For real services with discounts, use
`ServiceUtils.getTaxAmt` (Layer 2) which passes `hasDiscount: true` when applicable.

`taxRate` is the effective rate as a percentage (e.g. `8.25` for 8.25%).

Rounded per-service — callers multiply by `servCount` for the program total.

---

### `calculateServTotal({ servPrice, prepayDiscAmt, taxAmt }): number`

Calculates the net amount due for a **single service**.

```
total = (servPrice - prepayDiscAmt) + taxAmt
```

Callers multiply by `servCount` for the program total.

---

### `calculateTax({ price, taxRate, hasDiscount }): number`

Calculates the tax amount for a **single service price**.

Tax is calculated per service — the caller sums results for a program total.

```
rawTax = price × (taxRate / 100)
```

`taxRate` is the effective rate as a percentage (e.g. `8.25` for 8.25%). This is the
sum of all applicable tax code rates — the caller is responsible for computing it.

**Asymmetric rounding (matches SA5 behavior):**
- If a discount was applied (`hasDiscount: true`): `ceil(rawTax × 100) / 100`
- If no discount was applied (`hasDiscount: false`): `round(rawTax × 100) / 100`

`hasDiscount` refers to whether `service.x.applicableDiscounts` is non-empty (i.e.
service-level or program-level discounts). It does **not** refer to the prepay discount.

Returns `0` if `taxRate` is `0`.

---

## Layer 2 — Domain Helpers

### `ProgCodeUtils` — Theoretical pricing (price chart, no real services)

Used when proposing a new program from a `ProgCode`/`ServCode` price chart. No actual
`Service` records exist yet, so there are no `applicableDiscounts`. `hasDiscount` is
always `false` in this context.

**`getPrefPrice(size): number | null`**
Price per visit from the preferred price table.

**`getEconPrice(size): number | null`**
Price per visit from the economy price table.

**`getServPrice(size): number | null`**
Auto-selects preferred or economy price based on `isEcon` logic.
Uses `servCodes.length` on the scoped instance as the active service count.

**`getSubTotal(size): number | null`**
`getServPrice(size) × servCodes.length`

**`getPrepayDiscAmt(size, prepayPercent): number | null`**
Total prepay discount across all services.
Calls `calculatePrepayDiscAmt` per-service then multiplies by `servCodes.length`.

**`getTaxAmt(size, prepayPercent, taxRate): number | null`**
Total tax across all services, applied to the post-prepay price.
Calls `calculateTaxAmt` per-service then multiplies by `servCodes.length`.

**`getTotal(size, prepayPercent, taxRate): number | null`**
Total net amount due: `(subTotal - prepayDiscAmt) + taxAmt`.
Calls `calculateServTotal` per-service then multiplies by `servCodes.length`.

---

### `ServiceUtils` additions — Real service pricing

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

### Prepay/tax on real services (`ServiceUtils`)
When pricing real services for prepay letters, add to `ServiceUtils`:
- `getPrepayDiscAmt(prepayPercent)` — calls `calculatePrepayDiscAmt` using `getPriceAfterDiscounts("price")`
- `getTaxAmt(prepayPercent, taxRate)` — calls `calculateTaxAmt` with `hasDiscount: applicableDiscounts.length > 0`
- `getTotal(prepayPercent, taxRate)` — calls `calculateServTotal`

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
