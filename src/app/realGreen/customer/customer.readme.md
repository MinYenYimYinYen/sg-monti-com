# RealGreen Customer Module

This module handles the fetching, processing, and display of Customer, Program, and Service data from the RealGreen API.

## Data Flow Lifecycle

The data in this module follows a strict lifecycle to ensure type safety and consistency.

1.  **Raw (`[Entity]Raw`)**:
    *   **Source**: The RealGreen API.
    *   **Characteristics**: These types match the exact JSON structure returned by the external API. Field names are often inconsistent or obscure.
    *   **Example**: `CustomerRaw`, `ProgramRaw`.

2.  **Core (`[Entity]Core`)**:
    *   **Source**: The result of a "Remap" function (e.g., `remapCustomer`).
    *   **Characteristics**: These are clean, normalized JavaScript objects. Field names are standardized (camelCase), and useless data is discarded.
    *   **Example**: `CustomerCore`, `ProgramCore`.

3.  **Doc (`[Entity]Doc`)**:
    *   **Source**: The combination of `Core` and MongoDB metadata.
    *   **Characteristics**: This is the primary type used throughout the application pipeline and stored in the database. It includes `createdAt`, `updatedAt`, and the primary key (e.g., `custId`).
    *   **Definition**: `[Entity]Core & [Entity]DocProps`.
    *   **Example**: `CustomerDoc`.

4.  **Pipeline (`PipelineData`)**:
    *   **Source**: The output of a Search Step.
    *   **Characteristics**: A union of `Doc` arrays flowing through the search pipeline.
    *   **Definition**: `CustomerDoc[] | ProgramDoc[] | ServiceDoc[]`.

5.  **Hydrated (`[Entity]`)**:
    *   **Source**: The UI State (Redux Selectors).
    *   **Characteristics**: These objects contain additional computed fields or relationships needed for the UI (e.g., a Customer object that has an array of its Programs attached). This naked type is the standard for the rest of the codebase.
    *   **Definition**: `[Entity]Doc & [Entity]Props`.
    *   **Example**: `Customer`.

---

## Selectors (Context Tree Architecture)

The application uses a **"Context Tree"** pattern to hydrate entities with their relationships (Parents, Children, Siblings, Cousins) without causing circular dependency errors or infinite recursion in Redux/Immer.

### The Problem
We want to be able to navigate the graph freely:
*   `customer.programs` (Children)
*   `service.program` (Parent)
*   `service.program.services` (Siblings)
*   `service.program.customer.programs` (Cousins)

However, a naive implementation creates circular references (`A -> B -> A`), which breaks:
1.  **Immer**: Cannot freeze circular state.
2.  **Redux DevTools**: Crashes on serialization.
3.  **JSON.stringify**: Throws "Converting circular structure to JSON".

### The Solution: "Terminating DAG"
We build the tree in layers, ensuring that the "Upward" pointers (Parent) point to objects that do **not** have further upward pointers or infinite downward loops.

#### 1. The Base Tree (Top-Down)
First, we build the full hierarchy downwards using `Grouper` for O(N) efficiency.
*   `Customer` -> `Program[]` -> `Service[]`
*   This tree has **NO** parent pointers. It is a pure Directed Acyclic Graph (DAG).

#### 2. The Context Wrappers (Bottom-Up Views)
When you select a specific entity type (e.g., `selectServices`), we wrap the objects from the Base Tree in a "Context" object that adds the parent pointer.

**Example: `selectServices`**
Returns a `Service` object where:
*   `service.program` points to a **ContextProgram**.
    *   `ContextProgram` has `services` (Siblings).
    *   `ContextProgram` points to a **BaseCustomer**.
        *   `BaseCustomer` has `programs` (Cousins).
        *   `BaseCustomer` has **NO** parent pointer (Termination).

### Usage

All selectors are located in `src/app/realGreen/customer/selectors/contextSelectors.ts`.

```typescript
// 1. Import the selector
import { selectServices } from "@/app/realGreen/customer/selectors/contextSelectors";

// 2. Use in a Hook or Component
const services = useSelector((state: AppState) =>
  selectServices(state.activeCustomers) // Pass the slice state
);

// 3. Navigate freely
services.map(service => {
  console.log(service.program.customer.displayName); // Works!
  console.log(service.program.services.length);      // Works (Siblings)!
});
```

### Adding New Slices
Any Redux slice that stores Customer data must implement the `ContextSelectorState` interface (i.e., it must have `customerDocs`, `programDocs`, and `serviceDocs`).

```typescript
// activeCustomersSlice.ts
export const activeCustomersSelect = {
  // ...
  selectHydratedActiveCustomers: (state: AppState) =>
    selectCustomers(state.activeCustomers),
};
```

---

## Configuring Search Schemes

A `SearchScheme` defines a multi-step process to fetch related data from RealGreen. It is defined in `src/app/realGreen/customer/_lib/searchSchemes/searchSchemes.ts`.

### Step Types

1.  **Pagination Step (`createPaginationStep`)**:
    *   **Use Case**: Fetching a large list of records based on static criteria (e.g., "All Active Customers").
    *   **Behavior**: Iterates through pages of results until all records are fetched.
    *   **Config**:
        *   `stepName`: "customers" | "programs" | "services"
        *   `searchCriteria`: The criteria object (e.g., `{ statuses: ["9"] }`).

2.  **Batch Size Step (`createBatchSizeStep`)**:
    *   **Use Case**: Fetching records related to the *previous* step's results (e.g., "Programs for these Customers").
    *   **Behavior**: Batches IDs from the previous step and fetches results in chunks. Automatically optimizes batch size.
    *   **Config**:
        *   `stepName`: "customers" | "programs" | "services"
        *   `getIds`: Function to extract IDs from the previous step's data.
        *   `getSearchCriteria`: Function to create criteria using the batch of IDs.

### Examples

#### 1. Standard Hierarchy (Customer -> Program -> Service)

```typescript
const activeCustomers: SearchScheme = {
  schemeName: "activeCustomers",
  steps: [
    // Step 1: Get all active customers
    createPaginationStep({
      stepName: "customers",
      searchCriteria: { statuses: ["9"] },
    }),
    // Step 2: Get programs for those customers
    createBatchSizeStep({
      stepName: "programs",
      getIds: (pipelineData) => (pipelineData as CustomerDoc[]).map(c => c.custId),
      getSearchCriteria: (ids) => ({ custIds: ids, season: 2026 }),
    }),
    // Step 3: Get services for those programs
    createBatchSizeStep({
      stepName: "services",
      getIds: (pipelineData) => (pipelineData as ProgramDoc[]).map(p => p.progId),
      getSearchCriteria: (ids) => ({ progIds: ids, season: 2026 }),
    }),
  ],
};
```

#### 2. Negative Search (Filtering)

Scenario: Find Active Customers who **DO NOT** have an 'MLC' program.

```typescript
const missingMLC: SearchScheme = {
  schemeName: "missingMLC",
  steps: [
    // Step 1: Find all 'MLC' programs
    createPaginationStep({
      stepName: "programs",
      searchCriteria: { season: 2026, /* ...criteria for MLC... */ },
    }),
    // Step 2: Find all Active Customers, but FILTER out those found in Step 1
    createPaginationStep({
      stepName: "customers",
      searchCriteria: { statuses: ["9"] },
      filterFn: (fetchedCustomers, previousPrograms) => {
        const mlcCustomerIds = new Set((previousPrograms as ProgramDoc[]).map(p => p.custId));
        // Keep only customers NOT in the MLC set
        return (fetchedCustomers as CustomerDoc[]).filter(c => !mlcCustomerIds.has(c.custId));
      }
    }),
  ],
};
```

#### 3. Reverse Lookup (Service -> Customer)

Scenario: Find Customers who have a specific Service status.

```typescript
const serviceBasedSearch: SearchScheme = {
  schemeName: "serviceBased",
  steps: [
    // Step 1: Find Services ready for work
    createPaginationStep({
      stepName: "services",
      searchCriteria: { season: 2026, servStats: ["active"] },
    }),
    // Step 2: Find the Customers who own those services
    createBatchSizeStep({
      stepName: "customers",
      getIds: (pipelineData) => (pipelineData as ServiceDoc[]).map(s => s.custId),
      getSearchCriteria: (ids) => ({ custIds: ids }),
    }),
  ],
};
```
