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

---

## Handling Bad Records from RealGreen API (Error Thrown)

### The Problem

During production use, we discovered that the RealGreen API occasionally returns a `400 Bad Request` error with the message:

```
"Nullable object must have a value."
```

This error occurs when a specific record in their database has corrupted or malformed data. The error doesn't provide details about which record is problematic - it simply fails the entire batch request.

**Example Scenario:**
- Fetching services for 100 programs (progIds: 1-100)
- ProgId `42` has a corrupted service record
- The entire batch request fails, blocking access to all 100 programs' services

### The Solution: Binary Search Error Recovery

We implemented a two-tier binary search mechanism that isolates and skips only the corrupted record while recovering all valid data:

#### 1. **ID-Based Binary Search** (`binaryIdSearch.ts`)

Used when searching by IDs (e.g., progIds, custIds) in batch steps:

**How it works:**
1. When a batch of IDs causes an error, perform binary search on the ID array
2. Split the IDs in half and test each subset
3. Narrow down to the exact problematic ID (~9 steps for 500 IDs)
4. Fetch all records before the corrupted ID
5. Skip the corrupted ID
6. Fetch all records after the corrupted ID

**Implementation:** Applied in `createBatchSizeStep` (stepFactories.ts:363-409)

#### 2. **Offset-Based Binary Search** (`binaryOffsetSearch.ts`)

Used when pagination encounters corrupted data at specific offsets:

**How it works:**
1. When an offset-based request fails, perform binary search on the offset range
2. Narrow down to the exact corrupted offset position
3. Fetch all records before the corrupted offset
4. Skip the corrupted record
5. Fetch all records after the corrupted offset

**Implementation:** Applied in `fetchOverflow` (stepFactories.ts:128-153)

### Error Detection

Both binary search mechanisms only activate for the specific corrupted data error:

```typescript
const isCorruptedDataError =
  error instanceof Error &&
  error.message === "Nullable object must have a value.";
```

Other errors are immediately re-thrown (fail fast).

### Where This Happens

**Files:**
- `src/app/realGreen/customer/_lib/searchUtil/searchSchemes/schemeExecution/binaryIdSearch.ts`
- `src/app/realGreen/customer/_lib/searchUtil/searchSchemes/schemeExecution/binaryOffsetSearch.ts`
- `src/app/realGreen/customer/_lib/searchUtil/searchSchemes/schemeExecution/stepFactories.ts`

**Error Handling Locations:**
- Main batch fetch: `stepFactories.ts:363-409`
- Overflow fetch: `stepFactories.ts:128-153`

### Logging

When a corrupted record is encountered, the console will log:
- The corrupted ID (e.g., progId, custId) or offset
- The binary search process (each test iteration)
- How many valid records were recovered

**Example output:**
```
[binaryIdSearch] Starting binary search for corrupted ID in array of 100 IDs
[binaryIdSearch] Testing 50 IDs from index 50 to 99
[binaryIdSearch] Error! Corrupted ID is in second half (indices 50 to 99)
...
[binaryIdSearch] Corrupted ID isolated: 42 at index 41
[binaryIdSearch] Fetching records for 41 IDs before corrupted ID
[binaryIdSearch] Successfully fetched 205 records before corrupted ID
[binaryIdSearch] Skipping corrupted ID: 42
[binaryIdSearch] Fetching records for 58 IDs after corrupted ID
[binaryIdSearch] Successfully fetched 291 records after corrupted ID
```

### Future Enhancement (TODO)

Currently, the system only logs the corrupted ID. A future enhancement should:
1. Look up the program's `progCode` and `custId` from the pipelineData
2. Log these identifiers for easy lookup in the RealGreen CRM
3. Allow manual investigation and fixing of the corrupted record

See TODO comment in `binaryIdSearch.ts:71-74`.

### Performance Impact

- **Binary search steps:** ~log₂(N) API calls to isolate corruption
  - 500 records: ~9 additional calls
  - 1000 records: ~10 additional calls
- **Recovery:** 2 additional calls (before + after corrupted record)
- **Total overhead:** Minimal compared to blocking the entire batch

### Result

✅ The search scheme completes successfully, skipping only the corrupted record
✅ All valid data is fetched and displayed to the user
✅ The application remains functional despite data quality issues in the RealGreen API
✅ Developers can identify and report problematic records to RealGreen support
