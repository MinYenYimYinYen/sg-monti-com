---
name: write-tests
description: Write or modify Vitest tests for this project, especially pricing, tax, discount and Customer/Program/Service entity method tests built with generateCustomer. Use when adding a test file, changing a pure function that already has tests, or debugging a failing test.
---

# Write Tests

## Before you start

Read `src/__tests__/testing.readme.md` (required). For entity construction also read `src/app/realGreen/sampleData/samples.readme.md`.

## Hard rules

1. **Never construct `Service`, `Program` or `Customer` manually.** Use `generateCustomer` from `@/app/realGreen/sampleData/generateCustomer`. Manual construction skips the hydration pipeline and leaves broken circular references, so methods like `service.x.priceAfterTax()` silently read wrong data.
2. Tests live in `src/__tests__/`, mirroring the `src/` structure. File name pattern: `<Subject>.<behavior>.test.ts` (e.g. `ServiceUtils.priceAfterTax.test.ts`).
3. Scope: pure functions and entity method behavior. Redux slices/selectors, React components and API routes are currently out of scope (no store, DOM or DB setup).
4. `TaxCode.taxRate` is a whole-number percentage (`7.375` means 7.375%). Use `sampleTaxCode` from `sampleCustomer.ts` or a local `makeTaxCode(rate)` helper.
5. Use the named discount fixtures from `sampleDiscounts.ts` (`sampleCustomerDiscount`, `sampleProgramDiscount`, `sampleServiceDiscount`, `sampleServiceDiscount2`) instead of inline discounts.
6. Pricing tests cite the CRM screenshot value they mirror, in the `it(...)` title and the scenario comment (e.g. `(CRM: $26.09)`).

## Pattern

```typescript
import { generateCustomer } from "@/app/realGreen/sampleData/generateCustomer";
import { sampleProgramDiscount } from "@/app/realGreen/sampleData/sampleDiscounts";

const customer = generateCustomer({
  taxCodes: [{ taxCodeId: "TX1", taxRate: 7.375, available: true, createdAt: "", updatedAt: "" }],
  programs: [{
    discount: sampleProgramDiscount,
    services: [{ core: { price: 27.0 } }],
  }],
});

const service = customer.programs[0]!.services[0]!;
expect(service.x.priceAfterTax()).toBe(26.09);
```

## Run

```bash
npx vitest run <path-to-file-or-directory>
```

Always run the test you wrote (and the neighboring tests in the same directory) before reporting done. Report the pass/fail counts.
