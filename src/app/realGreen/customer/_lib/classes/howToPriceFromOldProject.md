# How to Price a Service from a Price Table

This document describes how to derive a price for a service given its size, using the
RealGreen `PriceTable` data returned by the RealGreen API.

---

## RealGreen API Endpoints

- **List available price tables (partial data):** `GET /PriceTable`
- **Get full price table with ranges:** `GET /PriceTable/{id}/Detailed`

The `/Detailed` endpoint is required because the list endpoint does not include the
`ranges` array needed for price calculation.

---

## Relevant RealGreen API Types

### `PriceTable`
Returned by `GET /PriceTable/{id}/Detailed`:

| Field                   | Type             | Notes                                              |
|-------------------------|------------------|----------------------------------------------------|
| `id`                    | `number`         | Unique identifier                                  |
| `description`           | `string`         | Human-readable name                                |
| `available`             | `boolean`        | Whether this table is active                       |
| `interpolate`           | `boolean`        | See note below — not used in this project          |
| `maxSize`               | `number`         | Upper size boundary for overflow calculation       |
| `maxRate`               | `number`         | Per-unit rate applied above the last range         |
| `ranges`                | `Range[]`        | Ordered list of size/rate breakpoints              |
| `roundCalculatedPrices` | `string \| null` | Rounding strategy — not used in this project       |
| `roundAmount`           | `string \| null` | Rounding increment — not used in this project      |

### `Range` (nested inside `PriceTable.ranges`)

| Field              | Type             | Notes                                         |
|--------------------|------------------|-----------------------------------------------|
| `id`               | `number`         | Unique identifier                             |
| `priceTableID`     | `number`         | Foreign key back to the parent `PriceTable`   |
| `size`             | `number`         | The **upper bound** of this range (inclusive) |
| `rate`             | `number`         | The price charged for services in this range  |
| `estimatedManHours`| `number \| null` | Not used for pricing                          |

---

## The Pricing Algorithm

Given a `PriceTable` and a `serviceSize` (number), derive the price as follows:

### Step 1 — Match a range (step-function lookup)

Iterate through `ranges` in ascending order of `size`. Return the `rate` of the
**first range** where `serviceSize <= range.size`.

```
for each range in ranges (ordered by size ascending):
    if serviceSize <= range.size:
        return range.rate
```

### Step 2 — Overflow (size exceeds all ranges)

If `serviceSize` is larger than every `range.size`, apply the overflow formula:

```
price = (serviceSize - priceTable.maxSize) * priceTable.maxRate + ranges[last].rate
```

Where `ranges[last]` is the range with the largest `size` value.

### Step 3 — No ranges

If `ranges` is empty, no price can be determined. Return `null` or treat as an error.

---

## Notes and Caveats

### `Service.price` vs `Service.nextPrice`

The RealGreen `Service` type has two price fields:

| Field        | Meaning                                                                 |
|--------------|-------------------------------------------------------------------------|
| `price`      | The price charged for this service in the **current season**            |
| `nextPrice`  | The planned price for the **same service next season**                  |

**Important:** Each season, RealGreen creates a **new `Service` object with a new identity** (new `id`) for the same recurring service. The `nextPrice` on the current season's service becomes the `price` on the next season's new service object.

This project uses `Service.price` (current season price) for all prepay letter calculations. If your replacement project needs to price for the upcoming season, use `Service.nextPrice` instead.

---

### `interpolate` is not implemented here
The `PriceTable` has an `interpolate` boolean field. This project does **not** implement
interpolation — it uses a pure step-function (first range whose upper bound fits the
size). If your replacement project needs interpolation, that logic would need to be
added separately.

### `roundCalculatedPrices` / `roundAmount` are not implemented here
These fields are present on the RealGreen `PriceTable` but are **not applied** in this
project's price calculation. The raw calculated price is used as-is.

### Ranges are assumed to be pre-sorted
The algorithm assumes `ranges` are ordered by `size` ascending. The RealGreen API
returns them in this order, but it is worth validating or sorting defensively in a new
implementation.

---

## Example

Given a `PriceTable` with:
```
ranges: [
  { size: 5000,  rate: 49.00 },
  { size: 10000, rate: 69.00 },
  { size: 15000, rate: 89.00 },
]
maxSize: 15000
maxRate: 0.002
```

| `serviceSize` | Result                                          | Price    |
|---------------|-------------------------------------------------|----------|
| 3000          | Matches first range (3000 ≤ 5000)               | $49.00   |
| 7500          | Matches second range (7500 ≤ 10000)             | $69.00   |
| 15000         | Matches third range (15000 ≤ 15000)             | $89.00   |
| 18000         | Overflow: (18000 - 15000) × 0.002 + 89.00      | $95.00   |

---

# How to Apply Discounts

This section describes how to calculate discount amounts using the RealGreen `DiscountCode`
type, as returned by the RealGreen API.

---

## RealGreen API Endpoint

- **List all discount codes:** `GET /DiscountCode`

---

## Relevant RealGreen API Type

### `DiscountCode`
Returned by `GET /DiscountCode`:

| Field                 | Type     | Notes                                                                 |
|-----------------------|----------|-----------------------------------------------------------------------|
| `id`                  | `string` | Unique identifier; matched against customer/program/service records   |
| `discountAmount`      | `number` | For PERCENT type: whole number (e.g. `7` = 7%). For DOLLAR type: dollar amount (e.g. `100` = $100 off) |
| `dollarDiscount`      | `number` | `1` = percentage discount, `2` = flat dollar discount                 |
| `discountDescription` | `string` | Human-readable label (e.g. "7% Discount", "$100 Off")                 |
| `isSurcharge`         | `boolean`| If true, this is a surcharge (adds to price) rather than a discount   |
| `available`           | `boolean`| Whether this code is active                                           |

---

## Where Discount Codes Are Attached

Discount codes can be attached at multiple levels in RealGreen:

| Level    | RealGreen Field                  | Matched By                  |
|----------|----------------------------------|-----------------------------|
| Customer | `Customer.discountCode`          | `DiscountCode.id`           |
| Program  | `Program.discountCodeId`         | `DiscountCode.id`           |
| Service  | `Service.discountCode`           | `DiscountCode.id`           |

In this project, the **service-level** and **program-level** discount codes are applied
when calculating the price for a prepay letter. The customer-level discount code is
available on the customer record but is not used in this calculation.

---

## The Discount Algorithm

Given a base `price` and a list of applicable `DiscountCode` records:

### Step 1 — Calculate each discount individually

For each `DiscountCode`:

- If `dollarDiscount === 2` (DOLLAR type):
  ```
  discountAmt = discountCode.discountAmount
  ```

- If `dollarDiscount === 1` (PERCENT type):
  ```
  discountAmt = round(price × (discountCode.discountAmount / 100) × 100) / 100
  ```

> **Important:** Each discount is rounded individually before summing. This matches
> how SA5 (RealGreen) calculates discounts.

### Step 2 — Sum all discount amounts

```
totalDiscountAmt = sum of all individual discountAmt values
```

### Step 3 — Cap at price (no negative prices)

```
if totalDiscountAmt > price:
    totalDiscountAmt = price

priceAfterDiscount = price - totalDiscountAmt
```

---

## ⚠️ `isSurcharge` is not implemented in this project

The `DiscountCode` type has an `isSurcharge: boolean` field. When `true`, the code
represents a **surcharge** — it should be **added** to the price rather than subtracted.

This project does **not** implement surcharge logic. All discount codes are treated as
price reductions regardless of the `isSurcharge` flag.

> **Action required for replacement project:** Implement surcharge handling. When
> `isSurcharge === true`, add the calculated amount to the price instead of subtracting it.

---

## Example

Given `price = 144.20` and a 7% discount code:

```
discountAmt = round(144.20 × 0.07 × 100) / 100 = round(10.094) = 10.09
priceAfterDiscount = 144.20 - 10.09 = 134.11
```

Given `price = 99.00` and a $100 flat discount:

```
discountAmt = min(100, 99) = 99   ← capped at price
priceAfterDiscount = 99.00 - 99.00 = 0.00
```

---

# Billing Type and Program Eligibility

The RealGreen `Program` type has a `billingType` field that determines how a customer
is billed for a program. This affects which programs are eligible for certain pricing
calculations.

---

## RealGreen API Field

`Program.billingType` — a string value returned as part of the `Program` object from
the RealGreen API (e.g. via `GET /Program` search results).

## Known Billing Type Values

| Value | Meaning         | Notes                                                        |
|-------|-----------------|--------------------------------------------------------------|
| `"A"` | Credit Card     | Billed by credit card                                        |
| `"C"` | Installment     | Billed in installments — **excluded from prepay letters**    |
| `"D"` | ACH             | Billed by bank draft                                         |
| `"M"` | Statement Only  | Billed by mailed statement                                   |
| `"R"` | Regular Invoice | Billed by regular invoice                                    |

## Prepay Letter Eligibility

Programs with `billingType === "C"` (Installment) are **excluded entirely** from prepay
letter pricing calculations. Installment customers are already on a payment plan and
are not offered a prepay discount.

All other billing types are eligible for prepay letter pricing.

---

# How to Calculate Sales Tax

This section describes how to calculate sales tax using the RealGreen `TaxCode` type,
as returned by the RealGreen API.

---

## RealGreen API Endpoint

- **List all tax codes:** `GET /Tax`

---

## Relevant RealGreen API Type

### `TaxCode`
Returned by `GET /Tax`:

| Field         | Type      | Notes                                                              |
|---------------|-----------|--------------------------------------------------------------------|
| `id`          | `string`  | Unique identifier; matched against `Customer.taxID1/2/3`           |
| `taxRate`     | `number`  | Stored as a whole-number percentage (e.g. `8.5` means 8.5%)       |
| `description` | `string`  | Human-readable label                                               |
| `available`   | `boolean` | Whether this tax code is active                                    |

---

## Where Tax Codes Are Attached

A customer can have up to three tax codes assigned:

| RealGreen Customer Field | Matched By   |
|--------------------------|--------------|
| `Customer.taxID1`        | `TaxCode.id` |
| `Customer.taxID2`        | `TaxCode.id` |
| `Customer.taxID3`        | `TaxCode.id` |

Collect all `TaxCode` records whose `id` matches any non-empty `taxID1/2/3` on the
customer. A customer may have zero, one, two, or three tax codes.

---

## The Tax Algorithm

Given a `price` (after discounts have been applied) and the customer's matched `TaxCode` records:

### Step 1 — Calculate the effective tax rate

```
taxRate = sum(taxCode.taxRate for each matched TaxCode) / 100
```

### Step 2 — Calculate the raw tax amount

```
rawTaxAmt = price × taxRate
```

### Step 3 — Round the tax amount

The rounding rule depends on whether a discount code was applied to the service or program:

- **If a discount code was applied** (service-level or program-level):
  ```
  taxAmt = ceil(rawTaxAmt × 100) / 100
  ```

- **If no discount code was applied:**
  ```
  taxAmt = round(rawTaxAmt × 100) / 100
  ```

> **Note:** This asymmetric rounding rule matches SA5's (RealGreen's) behavior exactly.
> It was determined empirically by comparing calculated values against SA5 output.

---

## Example

Given `price = 134.11` (after a 7% discount), tax rate of 8.5%, with a discount applied:

```
taxRate = 8.5 / 100 = 0.085
rawTaxAmt = 134.11 × 0.085 = 11.39935
taxAmt = ceil(11.39935 × 100) / 100 = ceil(1139.935) / 100 = 1140 / 100 = 11.40
```

Given `price = 89.00`, tax rate of 8.5%, with **no** discount:

```
rawTaxAmt = 89.00 × 0.085 = 7.565
taxAmt = round(7.565 × 100) / 100 = round(756.5) / 100 = 757 / 100 = 7.57
```
