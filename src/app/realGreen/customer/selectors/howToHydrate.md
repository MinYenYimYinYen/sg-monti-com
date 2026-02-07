# Entity Hydration Workflow (Base -> Central -> Rich)

## 1. Define Types

* **File**: `EntityTypes.ts`
* **Action**: Add relation arrays to the Props type.
    * Example: `customers: Customer[]` to `TaxCodeProps`.
    * Example: `taxCodes: TaxCode[]` to `CustomerProps`.

## 2. Create Base Selectors (Layer 1)

* **File**: `entityBaseSelectors.ts`
* **Goal**: Provide "Safe" objects (Docs + Empty Relations) to Central.
* **Steps**:
    1. Select raw docs.
    2. Map docs to full Entity type (initialize arrays to `[]`).
    3. Export a lookup Map (e.g., `basicEntityMap`).

## 3. Update Central Selectors (Layer 2)

* **File**: `centralSelectors.ts`
* **Goal**: Hydrate Core Entities (Customer/Program) with the new Entity.
* **Steps**:
    1. Import `basicEntityMap` from Base.
    2. Inside `selectCustomers` (or `selectPrograms`), look up the Entity by ID.
    3. Assign the Entity object (or array of objects) to the Core Entity.

    * *Note*: If circular dependency exists (e.g., Entity needs Customer ref), calculate Entity array *before* creating
      Customer object.

## 4. Create Rich Selectors (Layer 3)

* **File**: `entitySelectors.ts`
* **Goal**: Hydrate the new Entity with back-references to Core Entities.
* **Steps**:
    1. Import `centralSelect.customers` (or programs).
    2. Import `selectEntityDocs` (Raw).
    3. Create a Map of `CoreEntity[]` grouped by `EntityID`.
    4. Map over Entity Docs and attach the `CoreEntity[]` list.
    5. Export `selectRichEntities`.