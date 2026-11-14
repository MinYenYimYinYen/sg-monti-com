# Test Builders

`src/_builders/` holds one builder per entity. A builder returns a valid entity, so a test states only what it is about and never spends lines creating inputs.

## Convention

- **One verb: `make<Entity>(overrides)`.** `makeDiscount`, `makeTaxCode`, `makeAddress`, `makePriceTable`, `makePrepayConfig`, `makeProgCode`, `makeCustomer`. There is no `generate` or `create`.
- **One file per entity**, named for the builder. A builder never exports a second entity.
- **Flat entities take `Partial<Entity>`:** `makeDiscount({ amount: 10 })`. The defaults come from the entity's `base*` object where one exists, so a new field is fixed in one place.
- **Nested entities take a spec.** `Customer`, `Program` and `Service` hold circular references and `x` utils classes, so they cannot be built from a `Partial`. `makeCustomer(overrides)` takes a `MakeCustomerSpec`, a tree of `core` scalars, `programs`, `services` and the externally sourced props. The argument is still called `overrides`.
- **No shared sample constants.** A test that reads `sampleCustomer` has its inputs defined in another file, and editing the sample can change a test result. Build the entity in the test, or in a `<Area>TestHelpers.ts` beside it.
- **Prefer a narrower input type.** If the function under test takes `Pick<User, "userName" | "isSuperUser">`, pass a literal. A builder is for entities that are wide or nested.

## Layering

```
src/_builders/                          imports app types and base* objects only
src/app/<feature>/<area>/sampleData/    preview samples for the UI, built with the builders
src/__tests__/                          tests and *TestHelpers.ts, built with the builders
```

- A builder never imports from `sampleData/`, from `__tests__/` or from `vitest`. Samples are built on builders, so no cycle can form.
- App code does not import `_builders` except inside a feature's `sampleData/` folder. Today that is `src/app/prepayLetters/template/sampleData/`, which feeds the template editor preview.
- Anything that imports `vitest` (`vi.fn` loaders and the like) goes in a `*TestHelpers.ts` file next to the tests, never in a builder or a sample.

## `makeCustomer`

`makeCustomer()` with no arguments gives a valid customer with base defaults. It runs the same three-phase construction as `makeCustomersSelector` in `centralSelectors.ts`: build the customer without `x`, build each program, build each service and bind `x`. Never call `new ServiceUtils(...)`, `new ProgramUtils(...)` or `new CustomerUtils(...)` in a test, because that leaves `service.program` pointing at a placeholder and methods such as `service.x.priceAfterTax()` silently read wrong data.

```typescript
const customer = makeCustomer({
  taxCodes: [makeTaxCode({ taxRate: 7.375 })],
  programs: [{
    discount: makeDiscount({ amount: 10 }),
    services: [{ core: { price: 27.0 } }],
  }],
});
const service = customer.programs[0]!.services[0]!;
expect(service.x.priceAfterTax()).toBe(26.09);
```

- **`core?: Partial<EntityCore>`** holds scalar overrides with no externalities. A field added to `CustomerCore`, `ProgramCore` or `ServiceCore` is available here without a change.
- **External props** (`taxCodes`, `discount`, `callAhead`, `flags`, `callLogs`, `promise`, `promiseIssues`, `priorityService`) are resolved objects. You pass the object and the builder sets the foreign key.
- **`taxRate` cannot be set.** It is derived from `taxCodes`. Pass the tax codes.
- **Discounts are wired by `discountId`.** `makeDiscount` gives each discount its own id unless you pass one, so two discounts in one tree do not replace each other. Give them explicit ids only when the id is part of what the test asserts.
- **Compile-time coverage checks** at the bottom of `makeCustomer.ts` fail if `CustomerProps`, `ProgramProps` or `ServiceProps` gains an externally sourced field that the spec types do not cover.
- **IDs come from counters** (`PC1`, `SC1`, program and service ids), so they are unique within a test run but not stable across files. Pass explicit ids when a test asserts on one.

## Percentages and tax

`TaxCode.taxRate`, a `PERCENT` discount `amount` and `prepayPercent` are all whole-number percentages: `7.375` means 7.375%. The pricing functions divide by 100 internally. Do not pass fractions such as `0.07375`; that produces near-zero tax.

Tax is rounded per tax code, so a customer with several codes must be built with several `makeTaxCode` calls (6.875 and 0.5), not one pre-summed code. A 7.375% code and a 6.875% plus 0.5% pair can differ by a penny.

## `makeProgCode`

`ProgCode.x` is bound to the data it was built with. Spreading a new `priceTable` onto a copy does not change its pricing, so give the table to `makeProgCode`:

```typescript
const unpriceable = makeProgCode({
  progCode: { priceTable: makePriceTable({ ranges: [] }) },
  servCodes: [{ name: "Visit" }],
});
```

## Adding a builder

1. Create `src/_builders/make<Entity>.ts` exporting `make<Entity>(overrides: Partial<Entity> = {})`.
2. Spread the entity's `base*` object, then `overrides`. If the entity has no `base*`, keep neutral defaults inside the builder (see `makePrepayConfig`).
3. If a default must be unique per call, generate it (see the id counter in `makeDiscount`).
4. Do not export a sample constant from the same file.
