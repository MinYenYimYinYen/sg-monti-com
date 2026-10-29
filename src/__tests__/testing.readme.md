# Testing

## Test Runner

**Vitest** — configured in `vitest.config.ts`.

```bash
# Run all tests
npx vitest run

# Run a specific directory
npx vitest run src/__tests__/realGreen

# Run a specific file
npx vitest run src/__tests__/realGreen/customer/ServiceUtils.priceAfterTax.test.ts
```

---

## Test Location

Tests live in `src/__tests__/`, mirroring the `src/` directory structure:

```
src/__tests__/
  realGreen/
    customer/
      ServiceUtils.getPriceAfterDiscounts.test.ts
      ServiceUtils.priceAfterTax.test.ts
    priceTable/
      pricingFuncs.calculateTax.test.ts
  lib/
    ...
```

---

## What to Test

**Pure functions** — pricing calculations, utility functions, data transformations. These have no side effects and are the easiest to test reliably.

**Entity method behavior** — `ServiceUtils`, `ProgramUtils`, and `CustomerUtils` methods. These are tested by constructing a realistic entity via `generateCustomer` and asserting on the method output.

---

## What NOT to Test (Currently)

- **Redux slices and selectors** — require store setup; not currently in scope.
- **React components** — require DOM/rendering setup; not currently in scope.
- **API routes** — require database connections; not currently in scope.

---

## Entity Construction in Tests

**Always use `generateCustomer`** from `src/app/realGreen/sampleData/generateCustomer.ts`.

Never construct `Service`, `Program`, or `Customer` objects manually. Manual construction bypasses the hydration pipeline and produces entities with broken circular references (e.g., `service.program` pointing to a base placeholder instead of the actual program). This causes methods like `service.x.priceAfterTax()` to silently read wrong data.

See `src/app/realGreen/sampleData/samples.readme.md` for full documentation on `generateCustomer`.

### Pattern

```typescript
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import { sampleProgramDiscount } from "@/app/realGreen/sampleData/sampleDiscounts";

const customer = generateCustomer({
  taxCodes: [{ taxCodeId: "TX1", taxRate: 7.375, available: true, createdAt: "", updatedAt: "" }],
  programs: [{
    discount: sampleProgramDiscount,
    services: [{ core: { price: 27.00 } }],
  }],
});

const service = customer.programs[0]!.services[0]!;
expect(service.x.priceAfterTax()).toBe(26.09);
```

---

## TaxCode in Tests

`TaxCode.taxRate` is a **whole-number percentage** (e.g., `7.375` = 7.375%). This is consistent with all other percentage values in the pricing system (discounts, prepay, etc.). The pricing functions divide by 100 internally.

Use the `makeTaxCode` helper pattern for inline tax codes:

```typescript
function makeTaxCode(rate: number): TaxCode {
  return { taxCodeId: `TX-${rate}`, taxRate: rate, available: true, createdAt: "", updatedAt: "" };
}

// Usage
const customer = generateCustomer({
  taxCodes: [makeTaxCode(7.375)],
  ...
});
```

Or import `sampleTaxCode` from `sampleCustomer.ts` for the standard 7.375% rate.

**Tax is rounded per tax code**, so a customer with several codes must be built with several `TaxCode` entries (e.g. `6.875` + `0.5`), not one pre-summed code. A single 7.375% code and a 6.875% + 0.5% pair can differ by a penny.

---

## Discount Fixtures

Import named discount constants from `sampleDiscounts.ts` for readability:

| Export | Type | Value |
|---|---|---|
| `sampleCustomerDiscount` | 5% PERCENT | Customer-level permanent discount |
| `sampleProgramDiscount` | 10% PERCENT | Program-level discount |
| `sampleServiceDiscount` | $15 DOLLAR | Service-level dollar discount |
| `sampleServiceDiscount2` | 5% PERCENT | Service-level percent discount |

---

## CRM Reference Data

Tests that verify pricing calculations should cite the CRM screenshot values they're derived from. This makes it clear what real-world behavior the test is asserting and provides a paper trail for future debugging.

```typescript
/**
 * Scenario 2: 10% program discount, no prepay.
 * Expected net per service: $26.09 (CRM screenshot 2)
 */
it("returns correct net with 10% program discount and no prepay (CRM: $26.09)", () => {
  ...
  expect(service.x.priceAfterTax()).toBe(26.09);
});
```

---

## Existing Tests

| File | What it tests |
|---|---|
| `realGreen/customer/ServiceUtils.getPriceAfterDiscounts.test.ts` | Discount stacking (service + program level) |
| `realGreen/customer/ServiceUtils.priceAfterTax.test.ts` | Full pricing pipeline with tax (CRM reference values) |
| `realGreen/customer/ServiceUtils.prepayNoDiscount.test.ts` | 14-service no-discount customer at 3% prepay, tax codes 6.875% + 1.4%: per-service and grand totals, half-cent tie rounding (CRM reference values) |
| `realGreen/customer/ServiceUtils.prepayNoDiscount.customer2.test.ts` | 14-service no-discount customer at 3% prepay, tax codes 6.875% + 0.5%: per-tax-code rounding (166.74 → 12.29, not 12.30), per-service and grand totals (CRM reference values) |
| `realGreen/priceTable/pricingFuncs.calculateTax.test.ts` | `calculateTax` (incl. per-tax-code rounding) and `calculatePrepayServTotal` pure functions |
