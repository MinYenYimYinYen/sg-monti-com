---
name: write-tests
description: Write or modify Vitest tests for this project, especially pricing, tax, discount and Customer/Program/Service entity method tests built with the make* builders. Use when adding a test file, changing a pure function that already has tests, or debugging a failing test.
---

# Write Tests

## Before you start

Read `src/__tests__/testing.readme.md` (required). For entity construction also read `src/_builders/builders.readme.md`.

## Hard rules

1. **Build entities with the `make*` builders in `src/_builders/`** (`makeCustomer`, `makeDiscount`, `makeTaxCode`, `makeAddress`, `makePriceTable`, `makePrepayConfig`, `makeProgCode`). Never construct `Service`, `Program` or `Customer` manually: that skips the hydration pipeline and leaves broken circular references, so methods like `service.x.priceAfterTax()` silently read wrong data.
2. **No shared sample constants.** State the inputs in the test, or build them in a `<Area>TestHelpers.ts` beside it. If the function takes a narrow type (`Pick<User, "userName">`), pass a literal.
3. Tests live in `src/__tests__/`, mirroring the `src/` structure. File name pattern: `<Subject>.<behavior>.test.ts` (e.g. `ServiceUtils.priceAfterTax.test.ts`).
4. Scope: pure functions and entity method behavior. Redux slices/selectors, React components and API routes are currently out of scope (no store, DOM or DB setup).
5. `TaxCode.taxRate`, a `PERCENT` discount `amount` and `prepayPercent` are whole-number percentages (`7.375` means 7.375%). Build several `makeTaxCode` calls for several tax codes, because tax is rounded per code.
6. Pricing tests cite the CRM screenshot value they mirror, in the `it(...)` title and the scenario comment (e.g. `(CRM: $26.09)`).
7. `vitest` imports (`vi.fn` and the like) go in `*TestHelpers.ts` files, never in `src/_builders/` or a feature's `sampleData/`.

## Pattern

```typescript
import { makeCustomer } from "@/_builders/makeCustomer";
import { makeDiscount } from "@/_builders/makeDiscount";
import { makeTaxCode } from "@/_builders/makeTaxCode";

const customer = makeCustomer({
  taxCodes: [makeTaxCode({ taxRate: 7.375 })],
  programs: [{
    discount: makeDiscount({ amount: 10 }), // 10% PERCENT
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