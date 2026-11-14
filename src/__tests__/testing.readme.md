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

**Pure functions** — pricing calculations, utility functions, data transformations. These have no side effects and are
the easiest to test reliably.

**Entity method behavior** — `ServiceUtils`, `ProgramUtils`, and `CustomerUtils` methods. These are tested by
constructing a realistic entity via `makeCustomer` and asserting on the method output.

---

## What NOT to Test (Currently)

- **Redux slices and selectors** — require store setup; not currently in scope.
- **React components** — require DOM/rendering setup; not currently in scope.
- **API routes** — require database connections; not currently in scope.

---

## Test Data

**Build entities with the `make*` builders in `src/_builders/`.** Read `src/_builders/builders.readme.md` for the convention.

- One verb, `make<Entity>(overrides)`: `makeDiscount`, `makeTaxCode`, `makeAddress`, `makePriceTable`, `makePrepayConfig`, `makeProgCode`, `makeCustomer`.
- Flat entities take `Partial<Entity>`. `Customer`, `Program` and `Service` take a spec tree, because they hold circular references and `x` utils classes.
- Do not share sample constants between tests. A test that reads a shared constant has its inputs defined in another file, and editing the constant can change the result. Build the entity in the test, or in a `<Area>TestHelpers.ts` beside it (for example `prepayLetters/prepayTestHelpers.ts`).
- If the function under test takes a narrow type such as `Pick<User, "userName" | "isSuperUser">`, pass a literal and skip the builder.
- Keep `vitest` imports (`vi.fn` and the like) in `*TestHelpers.ts` files. Builders and preview samples never import `vitest`.

Never construct `Service`, `Program` or `Customer` objects manually. Manual construction bypasses the hydration pipeline and produces entities with broken circular references (for example `service.program` pointing at a base placeholder instead of the actual program). That makes methods like `service.x.priceAfterTax()` silently read wrong data.

### Pattern

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

### Tax and discounts

`TaxCode.taxRate` is a **whole-number percentage** (`7.375` is 7.375%), like discount amounts and prepay percents. The pricing functions divide by 100 internally.

**Tax is rounded per tax code**, so a customer with several codes must be built with several `makeTaxCode` calls (for example `6.875` and `0.5`), not one pre-summed code. A single 7.375% code and a 6.875% plus 0.5% pair can differ by a penny.

`makeDiscount` defaults to a 0% `PERCENT` discount. Set `discountType: DiscountType.DOLLAR` for a dollar amount. State the number in the test, for example `makeDiscount({ discountType: DiscountType.DOLLAR, amount: 15 })`, so the expected value can be checked without opening another file.

### Preview samples

The prepay letter template editor previews a sample letter. Those samples live in `src/app/prepayLetters/template/sampleData/` and are built on the builders. Prepay tests build their own entities; `prepayLetters/sampleData.test.ts` only checks that the preview data stays valid.

---
## CRM Reference Data

Tests that verify pricing calculations should cite the CRM screenshot values they're derived from. This makes it clear
what real-world behavior the test is asserting and provides a paper trail for future debugging.

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
