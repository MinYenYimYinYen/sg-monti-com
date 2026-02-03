# RealGreen Customer Module

This module handles the fetching, processing, and display of Customer, Program, and Service data from the RealGreen API.

## Data Flow Lifecycle

The data in this module follows a strict lifecycle to ensure type safety and consistency. The code is organized into `types`, `bases`, and `funcs` to enforce separation of concerns and avoid circular dependencies.

### 1. Types (`_lib/entities/types/`)
Pure TypeScript definitions. These files contain no runtime logic.
*   **Raw (`[Entity]Raw`)**: Matches the exact JSON structure returned by the RealGreen API.
*   **Core (`[Entity]Core`)**: Clean, normalized JavaScript objects (camelCase).
*   **Doc (`[Entity]Doc`)**: `Core` + MongoDB metadata (`createdAt`, `updatedAt`, `_id`).
*   **Hydrated (`[Entity]`)**: `Doc` + Relationships (`programs`, `services`, `customer`).

### 2. Bases (`_lib/entities/bases/`)
Default "Empty" objects for each entity type.
*   Used for initialization and as safe fallbacks for missing relationships.
*   Example: `baseCustomer`, `baseProgram`.

### 3. Funcs (`_lib/entities/funcs/`)
Pure functions for data transformation.
*   **Remappers**: Convert `Raw` -> `Core`.
*   **Extenders**: Convert `Core` -> `Doc` (Mocked for now).

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
*   This tree has **NO** parent pointers (or points to `base*` objects). It is a pure Directed Acyclic Graph (DAG).

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
Any Redux slice that stores Customer data must implement the `BaseCustomerState` interface defined in `_lib/types/SliceTypes.ts`.

```typescript
// activeCustomersSlice.ts
import { BaseCustomerState } from "@/app/realGreen/customer/_lib/types/SliceTypes";

type ActiveCustomersState = BaseCustomerState; // & any other state

export const activeCustomersSelect = {
  // ...
  selectHydratedActiveCustomers: createSelectCustomers(selectSlice),
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
        *   `optimizerKey`: (Optional) Unique key for the optimizer. Defaults to `stepName`.
        *   `searchCriteria`: The criteria object (e.g., `{ statuses: ["9"] }`).

2.  **Batch Size Step (`createBatchSizeStep`)**:
    *   **Use Case**: Fetching records related to the *previous* step's results (e.g., "Programs for these Customers").
    *   **Behavior**: Batches IDs from the previous step and fetches results in chunks. Automatically optimizes batch size.
    *   **Config**:
        *   `stepName`: "customers" | "programs" | "services"
        *   `optimizerKey`: (Optional) Unique key for the optimizer. Defaults to `stepName`.
        *   `getIds`: Function to extract IDs from the previous step's data.
        *   `getSearchCriteria`: Function to create criteria using the batch of IDs.

### The `optimizerKey` Property

The `optimizerKey` property is used to uniquely identify the optimization strategy (pagination page count or batch size) for a specific step within a scheme.

*   **Default**: If omitted, it defaults to the `stepName` (e.g., "customers").
*   **When to use**: You **MUST** provide a unique `optimizerKey` if your scheme contains multiple steps with the same `stepName`.
    *   *Example*: A scheme that searches for "Printed Services" (Step 1: Services) and then later fetches "Related Services" (Step 4: Services).
    *   Without unique keys, the optimizer would try to apply the "Pagination" strategy from Step 1 to the "BatchSize" strategy of Step 4, causing a crash.

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

#### 2. Complex Scheme with Duplicate Step Names (Using `optimizerKey`)

Scenario: Find "Printed" Services, then find their Customers, Programs, and finally all *other* Services for those Programs.

```typescript
const printedCustomers: SearchScheme = {
  schemeName: "printedCustomers",
  steps: [
    // Step 1: Services (Pagination) - Needs unique key
    createPaginationStep({
      stepName: "services",
      optimizerKey: "initialServices", // <--- Unique Key
      searchCriteria: { servStats: ["printed"] },
    }),
    // Step 2: Customers (Batch)
    createBatchSizeStep({
      stepName: "customers",
      getIds: (pipelineData) => (pipelineData as ServiceDoc[]).map(s => s.custId),
      getSearchCriteria: (ids) => ({ custIds: ids }),
    }),
    // Step 3: Programs (Batch)
    createBatchSizeStep({
      stepName: "programs",
      getIds: (pipelineData) => (pipelineData as CustomerDoc[]).map(c => c.custId),
      getSearchCriteria: (ids) => ({ custIds: ids }),
    }),
    // Step 4: Services (Batch) - Needs unique key to avoid collision with Step 1
    createBatchSizeStep({
      stepName: "services",
      optimizerKey: "relatedServices", // <--- Unique Key
      getIds: (pipelineData) => (pipelineData as ProgramDoc[]).map(p => p.progId),
      getSearchCriteria: (ids) => ({ progIds: ids }),
    }),
  ],
};
```
