# Legacy Logic Analysis: Customer Batch (`features/custBatch`)

## 1. Core Objective
The `custBatch` feature manages the retrieval and hydration of `Customer`, `Program`, and `Service` entities. It bridges the gap between flat API responses and a nested, UI-ready object graph (`ExtCust` -> `ExtProg` -> `ExtServ`).

## 2. Data Fetching Strategy (Thunks)
Located in `features/custBatch/thunks/`.

### Mechanism
*   **Chunking:** All thunks utilize a chunking strategy (default 500 items) to prevent API timeouts.
*   **Recursive Fetching:** The `getMore` function recursively fetches subsequent pages if a chunk is full.
*   **Optimization:** `apiFetchCount` is used to dynamically adjust chunk sizes based on historical performance.

### Key Thunks
1.  **`searchCustThunk`**:
    *   Fetches `Customer[]`.
    *   Modes: `fetchCount` (all), `byId` (specific IDs).
2.  **`searchProgThunk`**:
    *   Fetches `Program[]`.
    *   Modes: `fetchCount`, `byId`, `byCustomerId` (critical for hydrating specific customers).
3.  **`searchServThunk`**:
    *   Fetches `Service[]`.
    *   Modes: `fetchCount`, `byId`, `byProgramId`, `preliminary` (fetches IDs first to determine which customers to load).

## 3. State Management
Located in `features/custBatch/custBatchSlice.ts`.

*   **Batch Isolation:** State is partitioned by `BatchId` (`ACTIVE`, `PRINTED`, `SINGLE`, `PROD_DATE`), allowing multiple independent search contexts.
*   **Flat Storage:** Data is stored as flat arrays (`customers`, `programs`, `services`) before hydration.
*   **Progress Tracking:** A `Progress` enum orchestrates the sequence: `CUST_SEARCH` -> `PROG_SEARCH` -> `SERV_SEARCH`.

## 4. Hydration Logic (The "Process")
Located in `features/custBatch/buildExtCusts/`. This is the primary logic for converting flat data into the nested structure.

### The Builder: `buildExtCusts.ts`
*   **Input:** Flat arrays of `Customer`, `Program`, `Service`.
*   **Algorithm:**
    1.  **Indexing:** Builds `Map<CustomerId, Program[]>` and `Map<ProgramId, Service[]>` for O(1) access.
    2.  **Traversal:** Iterates `customers`, finds matching `programs`, then finds matching `services`.
    3.  **Injection:** Calls specific "hydrator" functions for each level.

### Hydrators & Dependencies
The hydration process injects auxiliary data from the global state (`realGreen` slice).

| Entity | Hydrator File | Injected Dependencies |
| :--- | :--- | :--- |
| **Customer** | `hydrateExtCustTemp.ts` | `TaxCode[]`, `DiscountCode`, `Flag[]`, `CallAhead` |
| **Program** | `hydrateExtProgTemp.ts` | `ProgramCode` (w/ `PriceTable`), `DiscountCode`, `CallAhead` |
| **Service** | `hydrateExtServTemp.ts` | `ServiceCode` (w/ `PriceTable`), `DiscountCode`, `CallAhead`, `ServiceCondition[]` |

### Key Types
*   **`ExtCust`**: The root hydrated object.
*   **`ExtProg`**: Child of `ExtCust`.
*   **`ExtServ`**: Child of `ExtProg`.

## 5. Orchestration (Hooks & Progress Thunk)
The data fetching process is driven by a state machine pattern, orchestrated by hooks and a dedicated "progress" thunk.

### The Engine: `useCustBatch` & `custBatchProgressThunk`
*   **`useCustBatch.ts`**: The primary hook. It monitors the `progress` state in Redux. When the state changes (and isn't `UNINITIALIZED` or `FINISHED`), it dispatches `handleCustBatchProgress`.
*   **`custBatchProgressThunk.ts`**: Acts as a state machine. It reads the current `progress` and dispatches the appropriate data fetching thunk (`fetchCustomers`, `fetchPrograms`, etc.), then advances the state.

### State Machine Flow
1.  **`CHECK_FOR_PRELIM_SEARCH`**: Decides whether to run a preliminary search (e.g., find services first) or go straight to customers.
2.  **`EXECUTE_PRELIM_SEARCH`**: (Optional) Fetches preliminary data (e.g., Service IDs) to filter the subsequent customer search.
3.  **`EXECUTE_CUST_SEARCH`**: Fetches customers.
4.  **`EXECUTE_PROG_SEARCH`**: Fetches programs for the loaded customers.
5.  **`EXECUTE_SERV_SEARCH`**: Fetches services for the loaded programs.
6.  **`FINISHED`**: Process complete.

### Preset Hooks
Specialized hooks exist to pre-configure the search settings for common use cases:
*   **`useActiveCustomers.ts`**: Configures searches for "Active" customers/programs/services for a given season.
*   **`useProdDateCustomers.ts`**: Configures a "Preliminary" search to find services completed on a specific date, then loads the associated customers and programs.

## 6. Migration Notes for Webstorm Gemini
*   **Dependency Boundary:** The hydration logic relies heavily on `realGreen` types (TaxCodes, etc.). Ensure these are available in the new system before attempting hydration.
*   **Missing Codes:** The legacy logic defaults to `baseProgramCode` or `baseServiceCode` if a specific code is not found. This fail-safe behavior should be preserved.
*   **Orchestration:** The state machine logic in `custBatchProgressThunk` is complex but robust. Consider replicating this pattern or using a more modern alternative (like a Saga or an async workflow) in the new architecture, but ensure the *sequence* (Cust -> Prog -> Serv) is maintained to ensure referential integrity during hydration.

## 7. Flow Example
**Execution Flow: `useActiveCustomers({ season: 2024, autoLoad: true })`**

1.  **Initialization & Setup**
    *   Component mounts and calls `useActiveCustomers`.
    *   Internal `useEffect` triggers `setup()`.
    *   **Action:** Dispatches `setSearchSettings` to Redux, populating `custBatch[ACTIVE]` with search criteria (filtered by season) and setting `autoLoad = true`.

2.  **The "Engine" Starts (useCustBatch)**
    *   `useCustBatch` hook observes: `autoLoad === true`, `settingsProvided === true`, and `progress === UNINITIALIZED`.
    *   **Action:** Dispatches `updateBatch({ progress: CHECK_FOR_PRELIM_SEARCH })`.

3.  **State Machine Loop: Step 1 (Check Prelim)**
    *   `useCustBatch` observes `progress` change -> dispatches `handleCustBatchProgress`.
    *   **Thunk Logic:** Checks if `prelimSearch` exists. For `useActiveCustomers`, it is `null`.
    *   **Action:** Updates state to `progress = EXECUTE_CUST_SEARCH`.

4.  **State Machine Loop: Step 2 (Fetch Customers)**
    *   `useCustBatch` observes `progress` change -> dispatches `handleCustBatchProgress`.
    *   **Thunk Logic:** Sees `EXECUTE_CUST_SEARCH`. Dispatches `searchCustThunk`.
    *   **Async API:** Fetches customers (chunked).
    *   **Reducer (Fulfilled):**
        *   Stores `customers` in state.
        *   Extracts Customer IDs and adds them to `progSearch`.
        *   Updates state to `progress = EXECUTE_PROG_SEARCH`.

5.  **State Machine Loop: Step 3 (Fetch Programs)**
    *   `useCustBatch` observes `progress` change -> dispatches `handleCustBatchProgress`.
    *   **Thunk Logic:** Sees `EXECUTE_PROG_SEARCH`. Dispatches `searchProgThunk` (mode: `byCustomerId`).
    *   **Async API:** Fetches programs for the loaded customers.
    *   **Reducer (Fulfilled):**
        *   Stores `programs` in state.
        *   Extracts Program IDs and adds them to `servSearch`.
        *   Updates state to `progress = EXECUTE_SERV_SEARCH`.

6.  **State Machine Loop: Step 4 (Fetch Services)**
    *   `useCustBatch` observes `progress` change -> dispatches `handleCustBatchProgress`.
    *   **Thunk Logic:** Sees `EXECUTE_SERV_SEARCH`. Dispatches `searchServThunk` (mode: `byProgramId`).
    *   **Async API:** Fetches services for the loaded programs.
    *   **Reducer (Fulfilled):**
        *   Stores `services` in state.
        *   Updates state to `progress = FINISHED`.

7.  **Hydration (UI Render)**
    *   Component selects data using `makeCustBatchExtCustSelector`.
    *   **Builder:** Takes the flat `customers`, `programs`, and `services` arrays from Redux.
    *   **Injection:** Injects Tax Codes, Discount Codes, etc., from the global `realGreen` slice.
    *   **Result:** Returns the fully hydrated `ExtCust[]` graph to the component.

## 8. Architectural Retrospective & Migration Directives

### 8.1 Orchestration: Shift from Client-Side Hooks to Server-Side Streaming
*   **Critique:** The legacy code relies heavily on React hooks (`useCustBatch`, `useEffect`) to drive a complex state machine for data fetching. This coupled business logic to the render cycle, causing race conditions and fragility.
*   **Directive:** Move the orchestration logic (Customer $\to$ Program $\to$ Service sequence) to the server (Next.js API Routes).
    *   **Implement Server-Side Orchestration:** The API route should handle the sequential fetching logic.
    *   **Implement Streaming Responses:** Stream results back to the client as they resolve, eliminating the need for a complex client-side `Progress` state machine.

### 8.2 State Management: Flatten and Simplify
*   **Critique:** The "Nested Sub-State" pattern (one slice managing multiple `BatchId` contexts like `ACTIVE`, `PRINTED`) was over-engineered and difficult to type/maintain. It solved a problem (context switching) that rarely occurred in practice.
*   **Directive:** Adopt a **Slice Factory Pattern**.
    *   Define a "Common Shape" and "Common Reducers" once.
    *   Generate distinct, named slices (e.g., `activeSearchSlice`, `singleCustSlice`) using a factory function.
    *   This provides the code reuse of a single slice with the strict typing and isolation of separate slices.
    *   Decouple "Search Optimization Data" (historical chunk sizes) from "Active View Data." Store optimization metrics independently so they persist without complicating the UI state.

### 8.3 Search Optimization: Abstraction & Location
*   **Critique:** The recursive chunking logic (`getMore`, `apiFetchCount`) is effective but cognitively heavy and hard to read. It currently lives in Redux Thunks.
*   **Directive:** **Encapsulate Recursion**.
    *   Evaluate moving the recursive fetching logic into the API route layer (Server) rather than the Thunk (Client).
    *   If kept on the client, abstract the recursion into a generic utility that is strictly separated from the business logic of *what* is being fetched.
    *   Maintain the "Ideal Chunk Size" learning mechanism, but simplify its implementation.

### 8.4 Hydration: Modular vs. Monolithic
*   **Critique:** `buildExtCusts` is a monolithic factory that constructs the entire object graph (Cust $\to$ Prog $\to$ Serv) and injects all auxiliary entities (Tax, Flags, Codes) in one pass. This makes extending the model difficult.
*   **Directive:** Implement **Layered, Composable Hydration**.
    *   Abandon the single "Tree Builder" approach.
    *   Use **Composable Selectors**:
        *   *Layer 1:* Customer Selector (hydrates only direct Customer props).
        *   *Layer 2:* Program Selector (hydrates Program props, composes into Customer).
        *   *Layer 3:* Service Selector (hydrates Service props, composes into Program).
    *   This ensures that adding a new entity (e.g., Documents) only requires modifying the specific layer relevant to it, rather than the root builder.

## 9. Strengths and Weaknesses

### 9.1 Strengths

#### Resilience & Reliability (The "Thunk" Logic)
*   **Adaptive Fetching:** The chunking strategy combined with the recursive `getMore` function is excellent for handling unpredictable dataset sizes. It effectively mitigates API timeouts and payload size limits without the consumer needing to know the details.
*   **Self-Optimizing:** The `apiFetchCount` mechanism is a sophisticated touch. It allows the application to "learn" the optimal request size over time, balancing network overhead against server limits.

#### Data Integrity & Safety
*   **Fail-Safe Hydration:** The hydration logic (`buildExtCusts`) is defensive. It uses fallbacks (e.g., `baseProgramCode`) when reference data is missing, preventing the entire UI from crashing due to a single bad data link.
*   **Strict Typing:** The distinction between raw API types (`Customer`) and hydrated UI types (`ExtCust`) is clear and well-enforced, reducing runtime errors in the view layer.

#### Context Isolation
*   **Batch Separation:** While complex, the `BatchId` system objectively succeeds at isolating data. It ensures that a "Single Customer" lookup never accidentally pollutes the "Active Customer" list, allowing for parallel workflows without race conditions in the data store.

### 9.2 Weaknesses

#### Fragile Orchestration (Coupling)
*   **UI-Driven Logic:** The most significant architectural weakness is driving the data fetching sequence (Cust $\to$ Prog $\to$ Serv) via React `useEffect` hooks. This couples business logic to the view layer's render cycle. If a component unmounts, re-renders unexpectedly, or if strict mode is enabled, the state machine can easily desynchronize or stall.

#### High Cognitive Load (Complexity)
*   **Distributed Logic:** To understand *how* data gets to the screen, a developer must trace a path through: `Hook` $\to$ `Slice (Progress Enum)` $\to$ `Progress Thunk` $\to$ `Fetch Thunk` $\to$ `Recursive Helper` $\to$ `Builder` $\to$ `Selector`. This high level of indirection makes debugging and onboarding difficult.
*   **Boilerplate:** The Redux implementation is heavy. Managing loading states, error states, and messages for *each* entity type within *each* batch results in a massive amount of state management code for what is effectively a linear data pipeline.

#### Monolithic Transformation
*   **Rigid Builder Pattern:** The `buildExtCusts` function is a "God Object" creator. It requires knowledge of every single relationship in the system. As the application grows, this file becomes a bottleneck; adding a simple relationship (e.g., "Customer Documents") requires modifying the central hydration logic, increasing the risk of regression.

### 9.3 Verdict
The system is **highly robust at the network layer** (it gets the data reliably) but **brittle at the orchestration layer** (the sequence depends on UI lifecycle) and **rigid at the transformation layer** (monolithic builder).

## 10. Webstorm Gemini Recommendation for Slice Architecture

Based on the analysis of the legacy code and your specific pain points (complexity, typing difficulties, unused overhead), here is my recommendation:

### Recommendation: Adopt "Separate Slices" generated via a Factory Pattern

You should move away from the single monolithic slice with dynamic keys (the dictionary approach) and instead implement **distinct, named slices** for your specific use cases (e.g., `activeSearchSlice`, `customerDetailSlice`, `productionDateSlice`).

Here is the reasoning and the strategy to make it maintainable:

#### 1. Superior Type Safety & Developer Experience
The current "Nested Sub-State" pattern forces you to use dynamic keys (index signatures). This defeats TypeScript's ability to autocomplete and validate your code. By using separate slices, `state.activeSearch` becomes a concrete, strictly typed object. You will know exactly what data is available without having to check if a specific `BatchId` exists in the dictionary.

#### 2. Clearer Debugging & State History
In Redux DevTools, the current approach results in generic action names where you have to inspect the payload to know which batch was updated. With separate slices, you will see explicit, self-documenting actions like `activeSearch/fetchSuccess` or `singleCust/update`. This makes tracing the flow of data significantly easier.

#### 3. Solves the "Code Duplication" Fear (The Factory Pattern)
You mentioned that separate slices might be harder to maintain. This is only true if you copy-paste the code. The solution is to use a **Slice Factory** (or Higher-Order Slice).
*   You define the "Common Shape" (loading, error, data arrays) and the "Common Reducers" **once**.
*   You then call this factory function to generate your specific slices.
*   This gives you the best of both worlds: the code reuse of a single slice, but the strict isolation and typing of separate slices.

#### 4. Perfect Alignment with Server-Side Orchestration
This approach aligns perfectly with your goal of moving logic to the server.
*   Your **`activeSearchSlice`** can be configured to call the **`api/search/active`** route.
*   Your **`singleCustSlice`** can be configured to call the **`api/search/single`** route.

Each slice becomes a simple container for the results of a specific, specialized server-side process. This removes the need for the client to know *how* to fetch the data (the recursion, the sequence), it just knows *where* to get it.

## 11. Code Glossary

### 11.1 Thunks & Helpers

**`searchCustThunk.ts`**
```typescript
import { createAsyncThunk } from "@reduxjs/toolkit";
import { Customer } from "@/realGreen/types/Customer";
import { ErrorHandler } from "@/utils/types/errors/ErrorHandler";
import { searchCustThunkFunc } from "@/features/custBatch/thunks/searchCustThunk.func";
import { chunkArray } from "@/utils/primitaves/chunkArray";
import { CustSearchThunkParams } from "@/features/custBatch/types/custBatchTypes";
import { apiFetchCount } from "@/features/custBatch/api/apiFetchCount";

const func = searchCustThunkFunc;
let isSearchPending = false;

export const searchCustThunk = createAsyncThunk<
  // Customer[] | { pending: true },
  Customer[] | undefined,
  CustSearchThunkParams,
  {
    rejectValue: string;
  }
>("custBatch/searchCust", async (params, { rejectWithValue }) => {
  if (isSearchPending) return;
  const chunkSize = 500;
  isSearchPending = true;
  const { batchId, fetchMethod, ...post } = params;
  if (!batchId) return rejectWithValue("batchId missing");

  try {
    switch (fetchMethod) {
      case "fetchCount": {
        const fetchCount = await apiFetchCount.get({
          id: batchId,
          searchType: "customer",
        });
        const offsets = func.getOffsets({ fetchCount, chunkSize });
        const promises = await func.getPromises({ post, offsets });
        const results = await Promise.all(promises);
        const lastResult = results[results.length - 1];
        const lastOffset = offsets[offsets.length - 1];
        let moreResults: Customer[] = [];
        if (lastResult.length === chunkSize) {
          moreResults = await func.getMore({
            chunkSize,
            lastOffset,
            post,
            maxDepth: 100,
          });
        }

        const fetchCountCustomers: Customer[] = results.flat();
        const moreCustomers: Customer[] = moreResults;
        const customers = [...fetchCountCustomers, ...moreCustomers];
        const newFetchCount = Math.ceil(customers.length / chunkSize);
        await apiFetchCount.post({
          id: batchId,
          searchType: "customer",
          fetchCount: newFetchCount,
        });
        return customers;
        // return { customers, pending: false };
      }
      case "byId": {
        const { search } = post;
        const { customerID } = search;
        if (!customerID) {
          return rejectWithValue("CustomerID missing from search");
        }
        const custIds = customerID!;
        const custIdChunks = chunkArray(custIds, chunkSize);
        const promises = await func.getChunkedPromises({ custIdChunks, post });
        const results = await Promise.all(promises);
        return results.flat();
        // return { customers: results.flat(), pending: false };
      }
      default: {
        return rejectWithValue("Invalid fetchMethod");
      }
    }
  } catch (e) {
    const handler = new ErrorHandler(e, "custBatch/searchCust", {
      params,
    });
    handler.handle();
    return rejectWithValue(handler.message);
  } finally {
    isSearchPending = false;
  }
});
```

**`searchCustThunk.func.ts`**
```typescript
import { delay } from "@/utils/primitaves/delay";
import { Customer } from "@/realGreen/types/Customer";
import { CustomerSearch } from "@/realGreen/types/CustomerSearch";
import { apiFetchCPS } from "@/features/custBatch/api/apiFetchCustProgServ";
import { getOffsets } from "@/features/custBatch/thunks/sharedThunkFunc";
import { SearchCustPost } from "@/features/custBatch/types/custBatchTypes";

async function getPromises(params: {
  post: SearchCustPost;
  offsets: number[];
}) {
  const { post, offsets } = params;
  const offsetPosts: SearchCustPost[] = offsets.map((offset) => {
    const postCopy: SearchCustPost = {
      ...post,
      search: { ...post.search, offset },
    };
    return postCopy;
  });

  const promises = [];
  for (const offsetPost of offsetPosts) {
    if (offsetPost.search.offset && offsetPost.search.offset > 0)
      await delay(10);
    promises.push(apiFetchCPS.cust(offsetPost));
  }
  return promises;
}

async function getMore(params: {
  chunkSize: number;
  lastOffset: number;
  post: SearchCustPost;
  maxDepth: number; // Maximum depth to limit excessive recursive calls
  currentDepth?: number; // Tracks the current recursion depth
}): Promise<Customer[]> {
  const { chunkSize, post, lastOffset, maxDepth, currentDepth = 0 } = params;

  // Stop recursion if maxDepth is reached
  if (currentDepth >= maxDepth) {
    console.warn(
      `MaxDepth of ${maxDepth} reached. Stopping further recursive API calls.`,
    );
    return [];
  }

  const offset = lastOffset + chunkSize;

  // Set the offset for the current fetch
  const currentPost: SearchCustPost = {
    ...post,
    search: { ...post.search, offset },
  };

  const currentResults = await apiFetchCPS.cust(currentPost);

  // Base case: If no results are returned, stop recursion
  if (currentResults.length === 0) {
    return [];
  }

  // Continue fetching if current results filled an entire chunk
  if (currentResults.length === chunkSize) {
    const nextResults = await getMore({
      chunkSize,
      lastOffset: offset,
      post,
      maxDepth, // Pass the maxDepth
      currentDepth: currentDepth + 1, // Increment the depth
    });
    return [...currentResults, ...nextResults];
  }

  return currentResults;
}

async function getChunkedPromises(params: {
  custIdChunks: number[][];
  post: SearchCustPost;
}) {
  const { custIdChunks, post } = params;
  const { search, fields } = post;
  const promises = [];
  let isFirst = true;
  for (const chunk of custIdChunks) {
    if (!isFirst) await delay(10);
    isFirst = false;
    const chunkedSearch: CustomerSearch = {
      ...search,
      customerID: chunk,
    };
    promises.push(
      apiFetchCPS.cust({
        search: chunkedSearch,
        fields,
      }),
    );
  }
  return promises;
}

export const searchCustThunkFunc = {
  getOffsets,
  getPromises,
  getMore,
  getChunkedPromises,
};
```

**`searchProgThunk.ts`**
```typescript
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ErrorHandler } from "@/utils/types/errors/ErrorHandler";
import { chunkArray } from "@/utils/primitaves/chunkArray";
import { Program } from "@/realGreen/types/Program";
import { ProgSearchThunkParams } from "../types/custBatchTypes";
import { searchProgThunkFunc } from "@/features/custBatch/thunks/searchProgThunk.func";
import { apiFetchCount } from "@/features/custBatch/api/apiFetchCount";

const func = searchProgThunkFunc;
let isSearchPending = false;

export const searchProgThunk = createAsyncThunk<
  Program[] | undefined,
  ProgSearchThunkParams,
  {
    rejectValue: string;
  }
>("custBatch/searchProg", async (params, { rejectWithValue }) => {
  if (isSearchPending) return;
  const chunkSize = 500;
  isSearchPending = true;
  const { batchId, fetchMethod, ...post } = params;
  if (!batchId) return rejectWithValue("batchId missing");

  try {
    switch (fetchMethod) {
      case "fetchCount": {
        const fetchCount = await apiFetchCount.get({
          id: batchId,
          searchType: "program",
        });
        const offsets = func.getOffsets({ fetchCount, chunkSize });
        const promises = await func.getPromises({ post, offsets });
        const results = await Promise.all(promises);
        const lastResult = results[results.length - 1];
        const lastOffset = offsets[offsets.length - 1];
        let moreResults: Program[] = [];
        if (lastResult.length === chunkSize) {
          moreResults = await func.getMore({
            chunkSize,
            lastOffset,
            post,
            maxDepth: 100,
          });
        }

        const fetchCountCustomers: Program[] = results.flat();
        const morePrograms: Program[] = moreResults;
        const programs = [...fetchCountCustomers, ...morePrograms];
        const newFetchCount = Math.ceil(programs.length / chunkSize);

        if (newFetchCount !== fetchCount && newFetchCount > 0) {
          await apiFetchCount.post({
            id: batchId,
            searchType: "program",
            fetchCount: newFetchCount,
          });
        }
        return programs;
      }
      case "byId": {
        const { search } = post;
        const { id } = search;
        if (!id) {
          return rejectWithValue("id missing from search");
        }
        const progIds = id!; // make it readable...
        const progIdChunks = chunkArray(progIds, chunkSize);
        const promises = await func.getChunkedPromises({ progIdChunks, post });
        const results = await Promise.all(promises);
        return results.flat();
      }

      case "byCustomerId": {
        const { search } = post;
        const { customerNumber } = search;
        if (!customerNumber || customerNumber.length === 0) {
          return rejectWithValue("customerNumber missing from search");
        }
        const custIds = customerNumber!;
        const idealChunkSize = await apiFetchCount.get({
          id: batchId,
          searchType: "programByCustomerNumber",
        });
        const custIdChunks = chunkArray(custIds, idealChunkSize);
        const promises = await func.getPromisesByCustIdChunk({
          post,
          chunks: custIdChunks,
          chunkSize: idealChunkSize,
        });
        const results = await Promise.all(promises);
        const programs = results.flat();
        const newIdeal = func.getNewIdealChunkSize({
          currentChunkSize: idealChunkSize,
          maxResultCount: results.reduce((acc, result) => {
            return Math.max(acc, result.length);
          }, 0),
          rgApiLimit: 500,
          safetyMultiplier: 0.75,
        });
        await apiFetchCount.post({
          id: batchId,
          searchType: "programByCustomerNumber",
          fetchCount: newIdeal,
        });

        return programs;
      }
      default: {
        return rejectWithValue("Invalid fetchMethod");
      }
    }
  } catch (e) {
    const handler = new ErrorHandler(e, "custProgServ/searchProg", {
      params,
    });
    handler.handle();
    return rejectWithValue(handler.message);
  } finally {
    isSearchPending = false;
  }
});
```

**`searchProgThunk.func.ts`**
```typescript
import { delay } from "@/utils/primitaves/delay";
import { apiFetchCPS } from "@/features/custBatch/api/apiFetchCustProgServ";
import {
  getNewIdealChunkSize,
  getOffsets,
} from "@/features/custBatch/thunks/sharedThunkFunc";
import { Program } from "@/realGreen/types/Program";
import { ProgramSearch } from "@/realGreen/types/ProgramSearch";
import { SearchProgPost } from "@/features/custBatch/types/custBatchTypes";

async function getPromises(params: {
  post: SearchProgPost;
  offsets: number[];
}) {
  const { post, offsets } = params;
  const offsetPosts: SearchProgPost[] = offsets.map((offset) => {
    const postCopy: SearchProgPost = {
      ...post,
      search: { ...post.search, offset },
    };
    return postCopy;
  });
  const promises = [];
  for (const offsetPost of offsetPosts) {
    if (offsetPost.search.offset && offsetPost.search.offset > 0)
      await delay(10);
    promises.push(apiFetchCPS.prog(offsetPost));
  }
  return promises;
}

async function getMore(params: {
  chunkSize: number;
  lastOffset: number;
  post: SearchProgPost;
  maxDepth: number; // New parameter to track the recursion depth
  currentDepth?: number; // Tracks the current depth (default to 0)
}): Promise<Program[]> {
  const { chunkSize, post, lastOffset, maxDepth, currentDepth = 0 } = params;

  // Stop recursion if maxDepth is reached
  if (currentDepth >= maxDepth) {
    console.warn(`MaxDepth reached: ${maxDepth}. Stopping further API calls.`);
    return [];
  }

  const offset = lastOffset + chunkSize;

  // Set the offset for the current fetch
  const currentPost: SearchProgPost = {
    ...post,
    search: { ...post.search, offset },
  };

  const currentResults = await apiFetchCPS.prog(currentPost);

  // Base case: If no results are returned, stop recursion
  if (currentResults.length === 0) {
    return [];
  }

  // Continue fetching if current results filled an entire chunk
  if (currentResults.length === chunkSize) {
    const nextResults = await getMore({
      chunkSize,
      lastOffset: offset,
      post,
      maxDepth, // Pass the maxDepth
      currentDepth: currentDepth + 1, // Increment the depth
    });
    return [...currentResults, ...nextResults];
  }

  return currentResults;
}

async function getChunkedPromises(params: {
  progIdChunks: number[][];
  post: SearchProgPost;
}) {
  const { progIdChunks, post } = params;
  const { search, fields } = post;
  const promises = [];
  let isFirst = true;
  for (const chunk of progIdChunks) {
    if (!isFirst) await delay(10);
    isFirst = false;
    const chunkedSearch: ProgramSearch = {
      ...search,
      id: chunk,
    };
    promises.push(
      apiFetchCPS.prog({
        search: chunkedSearch,
        fields,
      }),
    );
  }
  return promises;
}

async function getPromisesByCustIdChunk(params: {
  chunkSize: number;
  chunks: number[][];
  post: SearchProgPost;
}) {
  const { chunks, chunkSize, post } = params;
  const promises: Promise<Program[]>[] = [];
  let isFirst = true;
  for (const chunk of chunks) {
    if (!isFirst) await delay(10);
    isFirst = false;
    const chunkedPost: SearchProgPost = {
      ...post,
      search: { ...post.search, customerNumber: chunk },
    };
    promises.push(
      getMore({
        chunkSize,
        lastOffset: 0 - chunkSize,
        post: chunkedPost,
        maxDepth: 3,
      }),
    );
  }
  return promises;
}

export const searchProgThunkFunc = {
  getOffsets,
  getPromises,
  getMore,
  getChunkedPromises,
  getPromisesByCustIdChunk,
  getNewIdealChunkSize,
};
```

**`searchServThunk.ts`**
```typescript
import { createAsyncThunk } from "@reduxjs/toolkit";

import { ErrorHandler } from "@/utils/types/errors/ErrorHandler";
import { chunkArray } from "@/utils/primitaves/chunkArray";
import { ServSearchThunkParams } from "../types/custBatchTypes";
import { Service } from "@/realGreen/types/Service";
import { searchServThunkFunc } from "@/features/custBatch/thunks/searchServThunk.func";
import { CustomerSearch } from "@/realGreen/types/CustomerSearch";
import { apiFetchCount } from "@/features/custBatch/api/apiFetchCount";

const func = searchServThunkFunc;
let isSearchPending = false;

export const searchServThunk = createAsyncThunk<
  Service[] | undefined | CustomerSearch,
  ServSearchThunkParams,
  {
    rejectValue: string;
  }
>("custBatch/searchServ", async (params, { rejectWithValue }) => {
  if (isSearchPending) return;
  isSearchPending = true;
  const { batchId, fetchMethod, ...post } = params;
  if (!batchId) return rejectWithValue("batchId missing");
  const chunkSize = 500;
  try {
    switch (fetchMethod) {
      case "fetchCount": {
        const services = await func.fetchWithFetchCount({
          batchId,
          searchType: "service",
          post,
          chunkSize,
        });
        return services;
      }
      case "byId": {
        const { search } = post;
        const { id } = search;
        if (!id) {
          return rejectWithValue("id missing from search");
        }
        const servIds = id!; // make it readable...
        const servIdChunks = chunkArray(servIds, chunkSize);
        const promises = await func.getChunkedPromises({
          progIdChunks: servIdChunks,
          post,
        });
        const results = await Promise.all(promises);
        return results.flat();
      }

      case "byProgramId": {
        const { search } = post;
        const { programID } = search;
        if (!programID || programID.length === 0) {
          return rejectWithValue("programID missing from search");
        }
        const progIds = programID!;
        const idealChunkSize = await apiFetchCount.get({
          id: batchId,
          searchType: "serviceByProgId",
        });
        const progIdChunks = chunkArray(progIds, idealChunkSize);
        const promises = await func.getPromisesByProgIdChunk({
          post,
          chunks: progIdChunks,
          chunkSize: idealChunkSize,
        });
        const results = await Promise.all(promises);
        const services = results.flat();
        const newIdeal = func.getNewIdealChunkSize({
          currentChunkSize: idealChunkSize,
          maxResultCount: results.reduce((acc, result) => {
            return Math.max(acc, result.length);
          }, 0),
          rgApiLimit: 500,
          safetyMultiplier: 0.75,
        });

        await apiFetchCount.post({
          id: batchId,
          searchType: "serviceByProgId",
          fetchCount: newIdeal,
        });

        return services;
      }
      case "preliminary": {
        const services = await func.fetchWithFetchCount({
          batchId,
          searchType: "servicePreliminary",
          post,
          chunkSize,
        });

        const custSearch: CustomerSearch = {
          customerID: services.map((s) => s.customerNumber),
        };

        return custSearch;
      }
      default: {
        return rejectWithValue("Invalid fetchMethod");
      }
    }
  } catch (e) {
    const handler = new ErrorHandler(e, "custProgServ/searchServ", {
      params,
    });
    handler.handle();
    return rejectWithValue(handler.message);
  } finally {
    isSearchPending = false;
  }
});
```

**`searchServThunk.func.ts`**
```typescript
import { delay } from "@/utils/primitaves/delay";
import { apiFetchCPS } from "@/features/custBatch/api/apiFetchCustProgServ";
import {
  getNewIdealChunkSize,
  getOffsets,
} from "@/features/custBatch/thunks/sharedThunkFunc";
import { Service } from "@/realGreen/types/Service";
import { ServiceSearch } from "@/realGreen/types/ServiceSearch";
import { SearchServPost } from "@/features/custBatch/types/custBatchTypes";
import { FetchCountSearchType } from "@/features/custBatch/models/FetchCount.types";
import { apiFetchCount } from "@/features/custBatch/api/apiFetchCount";

async function getPromises(params: {
  post: SearchServPost;
  offsets: number[];
}) {
  const { post, offsets } = params;
  const offsetPosts: SearchServPost[] = offsets.map((offset) => {
    const postCopy: SearchServPost = {
      ...post,
      search: { ...post.search, offset },
    };
    return postCopy;
  });
  const promises = [];
  for (const offsetPost of offsetPosts) {
    if (offsetPost.search.offset && offsetPost.search.offset > 0)
      await delay(10);
    promises.push(apiFetchCPS.serv(offsetPost));
  }
  return promises;
}

async function getMore(params: {
  chunkSize: number;
  lastOffset: number;
  post: SearchServPost;
  maxDepth: number; // New parameter to track the recursion depth
  currentDepth?: number; // Tracks the current depth (default to 0)
}): Promise<Service[]> {
  const { chunkSize, post, lastOffset, maxDepth, currentDepth = 0 } = params;

  // Stop recursion if maxDepth is reached
  if (currentDepth >= maxDepth) {
    console.warn(`MaxDepth reached: ${maxDepth}. Stopping further API calls.`);
    return [];
  }

  const offset = lastOffset + chunkSize;

  // Set the offset for the current fetch
  const currentPost: SearchServPost = {
    ...post,
    search: { ...post.search, offset },
  };

  const currentResults = await apiFetchCPS.serv(currentPost);

  // Base case: If no results are returned, stop recursion
  if (currentResults.length === 0) {
    return [];
  }

  // Continue fetching if current results filled an entire chunk
  if (currentResults.length === chunkSize) {
    const nextResults = await getMore({
      chunkSize,
      lastOffset: offset,
      post,
      maxDepth, // Pass the maxDepth
      currentDepth: currentDepth + 1, // Increment the depth
    });
    return [...currentResults, ...nextResults];
  }

  return currentResults;
}

async function getChunkedPromises(params: {
  progIdChunks: number[][];
  post: SearchServPost;
}) {
  const { progIdChunks, post } = params;
  const { search, fields } = post;
  const promises = [];
  let isFirst = true;
  for (const chunk of progIdChunks) {
    if (!isFirst) await delay(10);
    isFirst = false;
    const chunkedSearch: ServiceSearch = {
      ...search,
      id: chunk,
    };
    promises.push(
      apiFetchCPS.serv({
        search: chunkedSearch,
        fields,
      }),
    );
  }
  return promises;
}

async function getPromisesByProgIdChunk(params: {
  chunkSize: number;
  chunks: number[][];
  post: SearchServPost;
}) {
  const { chunks, chunkSize, post } = params;
  const promises: Promise<Service[]>[] = [];
  let isFirst = true;
  for (const chunk of chunks) {
    if (!isFirst) await delay(10);
    isFirst = false;
    const chunkedPost: SearchServPost = {
      ...post,
      search: { ...post.search, programID: chunk },
    };
    promises.push(
      getMore({
        chunkSize,
        lastOffset: 0 - chunkSize,
        post: chunkedPost,
        maxDepth: 3,
      }),
    );
  }
  return promises;
}

async function fetchWithFetchCount({
  batchId,
  searchType,
  post,
  chunkSize,
}: {
  batchId: string;
  searchType: FetchCountSearchType;
  post: SearchServPost;
  chunkSize: number;
}): Promise<Service[]> {
  const fetchCount = await apiFetchCount.get({
    id: batchId,
    searchType,
  });

  const offsets = getOffsets({ fetchCount, chunkSize });
  const promises = await getPromises({ post, offsets });
  const results = await Promise.all(promises);

  const lastResult = results[results.length - 1];
  const lastOffset = offsets[offsets.length - 1];
  let moreResults: Service[] = [];
  if (lastResult.length === chunkSize) {
    moreResults = await getMore({
      chunkSize,
      lastOffset,
      post,
      maxDepth: 100,
    });
  }

  const services = [...results.flat(), ...moreResults];
  const newFetchCount = Math.ceil(services.length / chunkSize);

  if (newFetchCount !== fetchCount && newFetchCount > 0) {
    await apiFetchCount.post({
      id: batchId,
      searchType,
      fetchCount: newFetchCount,
    });
  }

  return services;
}

export const searchServThunkFunc = {
  // getOffsets,
  // getPromises,
  // getMore,
  getChunkedPromises,
  getPromisesByProgIdChunk,
  getNewIdealChunkSize,
  fetchWithFetchCount,
};
```

**`sharedThunkFunc.ts`**
```typescript
export function getOffsets(params: {
  fetchCount: number;
  chunkSize: number;
}): number[] {
  const { fetchCount, chunkSize } = params;

  // Generate offsets in an array [0, chunkSize, 2*chunkSize, ...]
  return Array.from({ length: fetchCount }, (_, index) => index * chunkSize);
}

export function getNewIdealChunkSize(params: {
  currentChunkSize: number;
  maxResultCount: number;
  rgApiLimit: number;
  safetyMultiplier: number;
}) {
  const { currentChunkSize, maxResultCount, rgApiLimit, safetyMultiplier } =
    params;
  if (maxResultCount === 0) return currentChunkSize;
  if (currentChunkSize === maxResultCount) return maxResultCount;

  const mathIdeal = (rgApiLimit * currentChunkSize) / maxResultCount;
  const safeIdeal = Math.floor(mathIdeal * safetyMultiplier);
  return safeIdeal;
}
```

**`custBatchProgressThunk.ts`**
```typescript
import { AppThunk } from "@/store/index.types";
import {
  Progress,
  custBatchActions,
} from "@/features/custBatch/custBatchSlice";

import { BatchId } from "@/features/custBatch/types/BatchId";
import { Dispatch } from "redux";
import {
  CustSearchThunkParams,
  ProgSearchThunkParams,
  ServSearchThunkParams,
} from "@/features/custBatch/types/custBatchTypes";
import { hasAnyDefinedKeys, hasDefined } from "@/utils/primitaves/typeGuard";
import { isValidCustomerSearch } from "@/realGreen/customer/isValidCustomerSearch";

const actions = custBatchActions;
const {
  ERROR,
  CHECK_FOR_PRELIM_SEARCH,
  EXECUTE_PRELIM_SEARCH,
  EXECUTE_CUST_SEARCH,
  EXECUTE_PROG_SEARCH,
  EXECUTE_SERV_SEARCH,
  FINISHED,
} = Progress;

/**
 * I learned while creating this (my first ever AppThunk) that typescript
 * is a lot more finicky about dispatch type.  With the current AppThunk definition:
 * `export type AppThunk<ReturnType = void> = ThunkAction<
 *   ReturnType, // The return type of the thunk (default is void)
 *   AppState, // The state of the Redux store
 *   undefined, // Optional extra argument passed to the thunk middleware
 *   PayloadAction // The type of actions that can be dispatched
 * >;`
 * async thunks dispatch just fine, but regular dispatches get complained about.
 * So, the solution was to narrow dispatch as Dispatch, as I did below in
 * the updateBatch function.
 * */
export const handleCustBatchProgress = (batchId: BatchId): AppThunk => {
  return async (dispatch, getState) => {
    const state = getState();
    const batchState = state.custBatch[batchId];
    const {
      progress,
      prelimSearch,
      custFields,
      baseCustSearch,
      custSearch,
      customers,
      progFields,
      progSearch,
      programs,
      servFields,
      servSearch,
      services,
    } = batchState;

    const updateBatch = (updates: Partial<typeof batchState>) =>
      (dispatch as Dispatch)(
        actions.updateBatch({
          batchId,
          updates,
        }),
      );

    try {
      switch (progress) {
        case CHECK_FOR_PRELIM_SEARCH: {
          if (prelimSearch) {
            updateBatch({ progress: EXECUTE_PRELIM_SEARCH });
            break;
          } else {
            updateBatch({
              progress: EXECUTE_CUST_SEARCH,
              custSearch: { ...baseCustSearch },
            });
            break;
          }
        }
        case EXECUTE_PRELIM_SEARCH: {
          const search = prelimSearch!;
          const { searchType } = search;
          switch (searchType) {
            case "service": {
              const { serviceSearch } = search;
              const params: ServSearchThunkParams = {
                batchId,
                fetchMethod: "preliminary",
                fields: ["customerNumber"],
                search: serviceSearch,
              };
              dispatch(actions.fetchServices(params));
              break;
            }
            case "program": {
              // Not implementing yet
              console.warn("prelim progSearch not implemented yet");
              updateBatch({ progress: ERROR });
              break;
            }
          }
          break;
        }
        case EXECUTE_CUST_SEARCH: {
          if (isValidCustomerSearch(custSearch)) {
            const params: CustSearchThunkParams = {
              batchId,
              search: custSearch,
              fields: custFields,
              fetchMethod: hasDefined(custSearch, "customerID")
                ? "byId"
                : "fetchCount",
            };
            dispatch(actions.fetchCustomers(params));
          } else {
            console.warn("Invalid customer search");
            updateBatch({ progress: ERROR });
          }
          break;
        }
        case EXECUTE_PROG_SEARCH: {
          if (hasAnyDefinedKeys(progSearch)) {
            const params: ProgSearchThunkParams = {
              batchId,
              fields: progFields,
              search: {
                ...progSearch,
                customerNumber: customers.map((c) => c.id),
              },
              fetchMethod: "byCustomerId",
            };
            dispatch(actions.fetchPrograms(params));
            break;
          }
          console.warn("Invalid ProgSearch");
          updateBatch({ progress: ERROR });
          break;
        }
        // case CHECK_FOR_SERV_SEARCH: {
        //   console.log("CHECK_FOR_SERV_SEARCH");
        //   if (programs.length === 0) {
        //     console.warn("No programs found");
        //     updateBatch({ progress: FINISHED });
        //     break;
        //   }
        //   if (hasAnyDefinedKeys(servSearch)) {
        //     updateBatch({ progress: EXECUTE_SERV_SEARCH });
        //     break;
        //   }
        //
        //   console.warn("No servSearch found");
        //   updateBatch({ progress: ERROR });
        //   break;
        // }
        case EXECUTE_SERV_SEARCH: {
          if (hasAnyDefinedKeys(servSearch)) {
            const params: ServSearchThunkParams = {
              batchId,
              fields: servFields,
              search: {
                ...servSearch,
                programID: programs.map((p) => p.id),
              },
              fetchMethod: "byProgramId",
            };
            dispatch(actions.fetchServices(params));
            break;
          }
          console.warn("Invalid ServSearch");
          updateBatch({ progress: ERROR });
          break;
        }
        case FINISHED: {
          if (services.length === 0) {
            console.warn("No services found");
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error in batch progress:", error);
      updateBatch({ progress: Progress.ERROR });
    }
  };
};
```

**`getSingleCustProgServThunk.ts`**
```typescript
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ErrorHandler } from "@/utils/types/errors/ErrorHandler";
import { SingleCustProgServ } from "@/features/custBatch/custBatchSlice";
import { GetSingleCPSParams } from "@/features/custBatch/types/custBatchTypes";
import { apiFetchCPS } from "@/features/custBatch/api/apiFetchCustProgServ";
import { singleCustValidator } from "@/features/custBatch/util/singleCustValidator";

export const getSingleCustProgServThunk = createAsyncThunk<
  SingleCustProgServ | undefined,
  GetSingleCPSParams,
  { rejectValue: string }
>("/getSingleCustProgServ", async (params, { rejectWithValue }) => {
  try {
    // const { validator } = params;
    const single = await apiFetchCPS.getSingle(params);
    if (!single) return undefined;
    const { customer } = single;
    if (customer) {
      const isValid = singleCustValidator(customer, params.custSearch);
      if (!isValid) return undefined;
    }

    return single;
  } catch (e) {
    const handler = new ErrorHandler(e, "/getSingleCustProgServ");
    handler.handle();
    return rejectWithValue(handler.message);
  }
});
```

### 7.2 API

**`apiFetchCount.ts`**
```typescript
import apiFrontend from "@/utils/api/axiosWrappers/apiFrontend";
import { ObjResponse } from "@/utils/types/apiBase";
import {
  FetchCountSearchType,
  IFetchCount,
} from "@/features/custBatch/models/FetchCount.types";
import { ErrorHandler } from "@/utils/types/errors/ErrorHandler";
import { ValidationError } from "@/utils/types/errors/customErrors";

async function get(params: {
  id: string;
  searchType: FetchCountSearchType;
}): Promise<number> {
  const { id, searchType } = params;
  const response = await apiFrontend<ObjResponse<IFetchCount>>({
    url: "/api/fetchCount",
    method: "GET",
    params: { rgSearchId: id, searchType },
  });
  return response.data.item.fetchCount;
}

async function post(params: {
  id: string;
  searchType: FetchCountSearchType;
  fetchCount: number;
}) {
  const { id: rgSearchId, searchType, fetchCount } = params;
  if (!fetchCount)
    throw new ValidationError("Fetch count must be greater than 0", params);
  const isAtLeastOne = fetchCount > 0;
  await apiFrontend({
    url: "/api/fetchCount",
    method: "POST",
    data: { rgSearchId, searchType, fetchCount: isAtLeastOne ? fetchCount : 1 },
  }).catch((error) => {
    new ErrorHandler(error, "apiFetchCount.post").handle();
  });
}

export const apiFetchCount = { get, post };
```

**`apiFetchCustProgServ.ts`**
```typescript
import { Customer } from "@/realGreen/types/Customer";
import apiFrontend from "@/utils/api/axiosWrappers/apiFrontend";
import { ArrayResponse, ObjResponse } from "@/utils/types/apiBase";
import { Program } from "@/realGreen/types/Program";
import { Service } from "@/realGreen/types/Service";
import {
  GetSingleCPSParams,
  SearchCustPost,
  SearchProgPost,
  SearchServPost,
} from "@/features/custBatch/types/custBatchTypes";
import { SingleCustProgServ } from "@/features/custBatch/custBatchSlice";

async function fetchCustomers(params: SearchCustPost): Promise<Customer[]> {
  const response = await apiFrontend<ArrayResponse<Customer>>({
    url: "/api/custProgServ/searchCust",
    method: "POST",
    data: params,
  });
  return response.data.items;
}

async function fetchPrograms(params: SearchProgPost): Promise<Program[]> {
  const response = await apiFrontend<ArrayResponse<Program>>({
    url: "/api/custProgServ/searchProg",
    method: "POST",
    data: params,
  });
  return response.data.items;
}

async function fetchServices(params: SearchServPost): Promise<Service[]> {
  const response = await apiFrontend<ArrayResponse<Service>>({
    url: "/api/custProgServ/searchServ",
    method: "POST",
    data: params,
  });
  return response.data.items;
}
async function apiGetSingleCustProgServ(
  params: GetSingleCPSParams,
): Promise<SingleCustProgServ | undefined> {
  const response = await apiFrontend<
    ObjResponse<SingleCustProgServ | undefined>
  >({
    url: "/api/custProgServ/getSingle",
    method: "POST",
    data: params,
  });
  return response.data.item;
}
export const apiFetchCPS = {
  cust: fetchCustomers,
  prog: fetchPrograms,
  serv: fetchServices,
  getSingle: apiGetSingleCustProgServ,
};
```

### 7.3 Hooks

**`useCustBatch.ts`**
```typescript
import { AppDispatch } from "@/store/index.types";
import { useDispatch, useSelector } from "react-redux";
import { custBatch_ss } from "@/features/custBatch/selectors/custBatch_ss";
import { BatchId } from "@/features/custBatch/types/BatchId";
import {
  custBatchActions,
  SubState,
  Progress,
} from "@/features/custBatch/custBatchSlice";
import { useCallback, useEffect } from "react";

import { handleCustBatchProgress } from "@/features/custBatch/thunks/custBatchProgressThunk";

const actions = custBatchActions;
const {
  UNINITIALIZED,
  ERROR,
  CHECK_FOR_PRELIM_SEARCH,

  FINISHED,
} = Progress;

export function useCustBatch(batchId: BatchId) {
  const dispatch = useDispatch<AppDispatch>();
  const select = custBatch_ss[batchId];

  const updateBatch = useCallback(
    (updates: Partial<SubState>) => {
      dispatch(actions.updateBatch({ batchId, updates }));
    },
    [dispatch, batchId],
  );

  const settingsProvided = useSelector(select.settingsProvided);
  const progress = useSelector(select.progress);
  const autoLoad = useSelector(select.autoLoad);

  useEffect(() => {
    if (autoLoad && progress === UNINITIALIZED && settingsProvided) {
      updateBatch({ progress: CHECK_FOR_PRELIM_SEARCH });
    }
  }, [autoLoad, progress, settingsProvided, updateBatch]);

  useEffect(() => {
    if ([UNINITIALIZED, FINISHED, ERROR].includes(progress)) return;
    dispatch(handleCustBatchProgress(batchId));
  }, [batchId, dispatch, progress]);

  const fetchCustomers = useCallback(() => {
    updateBatch({ progress: CHECK_FOR_PRELIM_SEARCH });
  }, [updateBatch]);

  return {
    fetchCustomers,
  };
}
```

**`useCustBatchSetup.ts`**
```typescript
import {
  custBatchActions,
  FieldSettings,
  SearchSettings,
} from "@/features/custBatch/custBatchSlice";
import { useCallback, useMemo } from "react";
import { BatchId } from "@/features/custBatch/types/BatchId";
import { AppDispatch } from "@/store/index.types";
import { useDispatch, useSelector } from "react-redux";
import { custBatch_ss } from "@/features/custBatch/selectors/custBatch_ss";
import { deepEqual } from "@/utils/stateManagement/deepEqual";

const actions = custBatchActions;

export function useCustBatchSetup(batchId: BatchId) {
  const select = custBatch_ss[batchId];
  const dispatch = useDispatch<AppDispatch>();

  const custFields = useSelector(select.custFields);
  const progFields = useSelector(select.progFields);
  const servFields = useSelector(select.servFields);
  const currentFieldSettings: FieldSettings = useMemo(() => {
    return {
      custFields,
      progFields,
      servFields,
    };
  }, [custFields, progFields, servFields]);

  const autoLoad = useSelector(select.autoLoad);
  const prelimSearch = useSelector(select.prelimSearch);
  const baseCustSearch = useSelector(select.baseCustSearch);
  const progSearch = useSelector(select.progSearch);
  const servSearch = useSelector(select.servSearch);

  const currentSearchSettings: SearchSettings = useMemo(() => {
    return {
      autoLoad,
      prelimSearch,
      baseCustSearch,
      progSearch,
      servSearch,
    };
  }, [autoLoad, baseCustSearch, prelimSearch, progSearch, servSearch]);

  const setup = useCallback(
    ({
      searchSettings,
      fieldSettings,
    }: {
      searchSettings: SearchSettings;
      fieldSettings?: FieldSettings;
    }) => {
      if (fieldSettings) {
        if (!deepEqual(fieldSettings, currentFieldSettings)) {
          dispatch(actions.setFieldSettings({ batchId, fieldSettings }));
        }
      }
      if (!deepEqual(searchSettings, currentSearchSettings)) {
        dispatch(actions.setSearchSettings({ batchId, searchSettings }));
      }
    },
    [batchId, currentFieldSettings, currentSearchSettings, dispatch],
  );

  return { setup };
}
```

**`useLoadCustomer.ts`**
```typescript
import { hasAnyDefinedKeys } from "@/utils/primitaves/typeGuard";
import { GetSingleCPSParams } from "@/features/custBatch/types/custBatchTypes";
import { custFlagActions } from "@/realGreen/custFlag/custFlagSlice";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { custBatch_ss } from "@/features/custBatch/selectors/custBatch_ss";
import { BatchId } from "@/features/custBatch/types/BatchId";
import { AppDispatch } from "@/store/index.types";
import { custBatchActions } from "@/features/custBatch/custBatchSlice";

export function useLoadCustomer({ batchId }: { batchId: BatchId }) {
  const dispatch = useDispatch<AppDispatch>();
  const select = custBatch_ss[batchId];
  const actions = custBatchActions;

  const custFields = useSelector(select.custFields);
  const custSearch = useSelector(select.custSearch);

  const progFields = useSelector(select.progFields);
  const progSearch = useSelector(select.progSearch);

  const servFields = useSelector(select.servFields);
  const servSearch = useSelector(select.servSearch);
  const settingsProvided = useSelector(select.settingsProvided);

  const loadCustomer = useCallback(
    (custId: number) => {
      if (!settingsProvided) return;
      if (
        !hasAnyDefinedKeys(custSearch) ||
        !hasAnyDefinedKeys(progSearch) ||
        !hasAnyDefinedKeys(servSearch)
      )
        return;
      const params: GetSingleCPSParams = {
        batchId,
        custId,
        custFields,
        servFields,
        progFields,
        custSearch,
        progSearch,
        servSearch,
        // validator,
      };
      dispatch(actions.getSingle(params));
      dispatch(custFlagActions.syncSingleCustFlags({ custId }));
    },
    [
      settingsProvided,
      custSearch,
      progSearch,
      servSearch,
      batchId,
      custFields,
      servFields,
      progFields,
      dispatch,
      actions,
    ],
  );

  return { loadCustomer };
}
```

**`useActiveCustomers.ts`**
```typescript
import { CustomerSearch } from "@/realGreen/types/CustomerSearch";
import { ProgramSearch } from "@/realGreen/types/ProgramSearch";
import { ServiceSearch } from "@/realGreen/types/ServiceSearch";
import { getServiceStatuses } from "@/utils/api/serviceStatusFunc";
import { BatchId } from "@/features/custBatch/types/BatchId";
import { useCustBatch } from "@/features/custBatch/hooks/useCustBatch";
import { useCustBatchSetup } from "@/features/custBatch/hooks/useCustBatchSetup";
import { useSelector } from "react-redux";
import { custBatch_ss } from "@/features/custBatch/selectors/custBatch_ss";
import { useEffect } from "react";

const custSearch: CustomerSearch = {
  customerStatus: { minValue: "9", maxValue: "9" },
};

const progSearch: ProgramSearch = {
  status: ["9"],
};

const servSearch: ServiceSearch = {
  serviceStatus: getServiceStatuses(["completed", "printed", "asap", "active"]),
};

export const useActiveCustomers = ({
  season,
  autoLoad = false,
}: {
  season: number;
  autoLoad?: boolean;
}) => {
  const { fetchCustomers } = useCustBatch(BatchId.ACTIVE);
  const { setup } = useCustBatchSetup(BatchId.ACTIVE);
  const canFetchCustomers = useSelector(
    custBatch_ss[BatchId.ACTIVE].canFetchCustomers_s,
  );

  useEffect(() => {
    if (!(season > 0)) return;
    setup({
      searchSettings: {
        autoLoad,
        prelimSearch: null,
        baseCustSearch: { ...custSearch },
        progSearch: {
          ...progSearch,
          serviceYear: { minValue: season, maxValue: season },
        },
        servSearch: {
          ...servSearch,
          serviceYear: [season],
        },
      },
    });
  }, [autoLoad, season, setup]);

  // const loadCustomer = useCallback(
  //   (custId: number) => loadSingleCPS(custId, validator),
  //   [loadSingleCPS],
  // );

  return { fetchCustomers, canFetchCustomers };
};
```

**`useProdDateCustomers.ts`**
```typescript
import { BatchId } from "@/features/custBatch/types/BatchId";
import { getServiceStatuses } from "@/utils/api/serviceStatusFunc";
import { dateCompare } from "@/utils/primitaves/dateCompare";
import { useCustBatchSetup } from "@/features/custBatch/hooks/useCustBatchSetup";
import { useCustBatch } from "@/features/custBatch/hooks/useCustBatch";
import { useEffect, useMemo } from "react";

/**
 * If prodDate is not a valid date string, all searches will be set to null
 * */
export const useProdDateCustomers = ({
  prodDate,
}: {
  prodDate: string | undefined;
}) => {
  const isValidDate = useMemo(() => {
    if (!prodDate) return false;
    return dateCompare.isValidDateString(prodDate);
  }, [prodDate]);

  const season = useMemo(() => {
    if (!prodDate) return -1;
    return parseInt(prodDate.split("-")[0]);
  }, [prodDate]);

  const { fetchCustomers } = useCustBatch(BatchId.PROD_DATE);

  const { setup } = useCustBatchSetup(BatchId.PROD_DATE);

  useEffect(() => {
    setup({
      searchSettings: {
        autoLoad: false,
        prelimSearch: isValidDate
          ? {
              searchType: "service",
              serviceSearch: {
                serviceStatus: getServiceStatuses(["completed"]),
                startDate: { minValue: prodDate, maxValue: prodDate },
              },
            }
          : null,
        baseCustSearch: isValidDate
          ? {
              customerStatus: { minValue: "9", maxValue: "9" },
            }
          : null,
        progSearch: isValidDate
          ? {
              serviceYear: { minValue: season, maxValue: season },
              status: ["9"],
            }
          : null,
        servSearch: isValidDate
          ? {
              serviceYear: [season],
              serviceStatus: getServiceStatuses([
                "completed",
                "printed",
                "asap",
                "active",
              ]),
            }
          : null,
      },
    });
  }, [isValidDate, prodDate, season, setup]);
  return {
    fetchCustomers,
  };
};
```

### 7.4 Hydration (Builder)

**`buildExtCusts.ts`**
```typescript
import { Customer } from "@/realGreen/types/Customer";
import { Program } from "@/realGreen/types/Program";
import { Service } from "@/realGreen/types/Service";
import { ProgramCode } from "@/realGreen/types/ProgramCode";
import { IServCode } from "@/realGreen/progServ/models/ExtServCode.types";
import {
  ExtCust,
  ExtProg,
  ExtServ,
} from "@/features/custBatch/types/ExtCust.types";
import {
  BuildExtCustOptions,
  ExtCustTemp,
} from "@/features/custBatch/types/buildExtCusts.types";
import { hydrateExtCustTemp } from "@/features/custBatch/buildExtCusts/hydrateExtCustTemp";
import { hydrateExtProgTemp } from "@/features/custBatch/buildExtCusts/hydrateExtProgTemp";
import { hydrateExtServTemp } from "@/features/custBatch/buildExtCusts/hydrateExtServTemp";

function build(params: {
  customers: Customer[];
  programs: Program[];
  services: Service[];
  options: BuildExtCustOptions;
}): ExtCust[] {
  const { customers, programs, services, options } = params;
  // const extPropertyData = await getExtData(options);

  const progMapCustId = new Map<number, Program[]>();
  programs.forEach((program: Program) => {
    const custPrograms = progMapCustId.get(program.customerNumber) || [];
    custPrograms.push(program);
    progMapCustId.set(program.customerNumber, custPrograms);
  });

  const servMapProgId = new Map<number, Service[]>();
  services.forEach((service: Service) => {
    const progServices = servMapProgId.get(service.programID) || [];
    progServices.push(service);
    servMapProgId.set(service.programID, progServices);
  });

  const extCusts: ExtCust[] = customers.map((customer) => {
    const eCustTemp: ExtCustTemp = hydrateExtCustTemp({
      customer,
      options,
    });

    const customerPrograms = progMapCustId.get(customer.id) || [];
    customerPrograms.forEach((program) => {
      const eProgTemp = hydrateExtProgTemp({
        program,
        options,
        eCustTemp,
      });
      const programServices = servMapProgId.get(program.id) || [];
      programServices.forEach((service) => {
        const extServTemp = hydrateExtServTemp({
          service,
          options,
          eCustTemp,
          eProgTemp,
        });
        eProgTemp.services.push(extServTemp);
      });
      eCustTemp.programs.push(eProgTemp);
    });
    const eCust: ExtCust = {
      ...eCustTemp,
      programs: eCustTemp.programs.map((eProgTemp) => {
        const extServs: ExtServ[] = eProgTemp.services.map((eServTemp) => {
          const eServ: ExtServ = {
            ...eServTemp,
            serviceCode:
              eServTemp.serviceCode || (undefined as unknown as IServCode),
            eCust: {
              ...eCustTemp,
              programs: [] as ExtProg[],
            },
            eProg: {
              ...eProgTemp,
              programCode:
                eProgTemp.programCode || (undefined as unknown as ProgramCode),
              services: [] as ExtServ[],
              eCust: {
                ...eProgTemp.eCust!,
                programs: [] as ExtProg[],
              },
            },
          };
          return eServ;
        });
        const eProg: ExtProg = {
          ...eProgTemp,
          services: extServs,
          programCode:
            eProgTemp.programCode || (undefined as unknown as ProgramCode),
          eCust: {
            ...eCustTemp,
            programs: [] as ExtProg[],
          },
        };
        return eProg;
      }),
      taxCodes: eCustTemp.taxCodes,
      flags: eCustTemp.flags,
    };
    return eCust;
  });
  return extCusts;
}

export const extCustFunc = { build };
```

**`hydrateExtCustTemp.ts`**
```typescript
import { Customer } from "@/realGreen/types/Customer";
import {
  BuildExtCustOptions,
  ExtCustTemp,
  ExtProgTemp,
} from "@/features/custBatch/types/buildExtCusts.types";
import { TaxCode } from "@/realGreen/types/TaxCode";
import { flagFunc } from "@/realGreen/flag/flagFunc";

export function hydrateExtCustTemp(params: {
  customer: Customer;
  options: BuildExtCustOptions;
}): ExtCustTemp {
  const { options, customer } = params;
  const {
    hydrateTaxCodes,
    hydrateDiscountCodes,
    hydrateFlags,
    hydrateCallAheads,
  } = options;
  const custTaxCodeIds = [
    customer.taxID1,
    customer.taxID2,
    customer.taxID3,
  ].filter((taxId) => !!taxId);

  const taxCodes =
    (hydrateTaxCodes
      ?.filter((taxCode) => custTaxCodeIds.includes(taxCode.id))
      .filter((taxCode) => !!taxCode) as TaxCode[]) || [];

  const discountCode = hydrateDiscountCodes?.find(
    (discountCode) => customer.discountCode === discountCode.id,
  );

  const flags = flagFunc.getFlagsForCustId({
    custId: customer.id,
    flags: hydrateFlags?.flags || [],
    custFlags: hydrateFlags?.custFlags || new Map<number, number[]>(),
  });

  const callAhead = hydrateCallAheads?.find(
    (callAhead) => callAhead.id === customer.callCode,
  );

  const extCustTemp = {
    customer,
    taxCodes,
    discountCode,
    callAhead,
    flags: flags,
    programs: [] as ExtProgTemp[],
    position: {
      lat: customer.address.latitude || 0,
      lng: customer.address.longitude || 0,
    },
  };
  return extCustTemp;
}
```

**`hydrateExtProgTemp.ts`**
```typescript
import { Program } from "@/realGreen/types/Program";
import {
  BuildExtCustOptions,
  ExtCustTemp,
  ExtProgTemp,
  ExtServTemp,
} from "@/features/custBatch/types/buildExtCusts.types";
import { baseProgramCode } from "@/realGreen/types/ProgramCode";

export function hydrateExtProgTemp(params: {
  program: Program;
  eCustTemp: ExtCustTemp;
  options: BuildExtCustOptions;
}): ExtProgTemp {
  const { program, eCustTemp, options } = params;
  const {
    hydrateProgramCodes,
    hydratePriceTables,
    hydrateDiscountCodes,
    hydrateCallAheads,
  } = options;
  let matchedProgramCode = hydrateProgramCodes?.find(
    (progCode) => progCode.programDefinitionID === program.programCodeId,
  );

  if (!matchedProgramCode) {
    matchedProgramCode = baseProgramCode;
  }
  const programCode = matchedProgramCode;

  const matchedDiscountCode = hydrateDiscountCodes?.find(
    (discountCode) => discountCode.id == program.discountCodeId,
  );
  const discountCode = matchedDiscountCode;

  const programPriceTable = hydratePriceTables?.find(
    (ppt) => ppt.programCode === programCode.programCode,
  );

  const callAhead = hydrateCallAheads?.find(
    (callAhead) => callAhead.id === program.callAhead,
  );

  // Ok if this is undefined.  Not all program codes have a mapped price table.
  const extProgTemp = {
    eCust: eCustTemp,
    services: [] as ExtServTemp[],
    program,
    callAhead,
    programCode: {
      ...programCode,
      programPriceTable,
    },
    discountCode,
  };
  return extProgTemp;
}
```

**`hydrateExtServTemp.ts`**
```typescript
import { Service } from "@/realGreen/types/Service";
import {
  BuildExtCustOptions,
  ExtCustTemp,
  ExtProgTemp,
  ExtServTemp,
} from "@/features/custBatch/types/buildExtCusts.types";
import { baseServiceCode } from "@/realGreen/progServ/models/ExtServCode.types";
import { ServiceCondition } from "@/realGreen/types/ServiceCondition";

export function hydrateExtServTemp(params: {
  service: Service;
  eCustTemp: ExtCustTemp;
  eProgTemp: ExtProgTemp;
  options: BuildExtCustOptions;
}): ExtServTemp {
  const { service, eCustTemp, eProgTemp, options } = params;
  const {
    hydratePriceTables,
    hydrateDiscountCodes,
    hydrateServiceCodes,
    hydrateCallAheads,
    hydrateServiceConditions,
  } = options;

  const serviceCodeMatch = hydrateServiceCodes?.find(
    (serviceCode) => serviceCode.saId === service.serviceCode,
  );

  const serviceCode = serviceCodeMatch || baseServiceCode;

  const discountCode = hydrateDiscountCodes?.find(
    (discountCode) => discountCode.id === service.discountCode,
  );

  const programPriceTable = hydratePriceTables?.find(
    (ppt) => ppt.programCode === serviceCode.programCode.programCode,
  );

  const callAhead = hydrateCallAheads?.find(
    (callAhead) => callAhead.id === service.callAhead,
  );

  let matchedServiceConditions: ServiceCondition[] = [];
  if (hydrateServiceConditions) {
    const { conditionCodes, serviceConditions } = hydrateServiceConditions;
    const matched = serviceConditions.filter(
      (sc) => sc.serviceID === service.id,
    );
    matchedServiceConditions = matched.map((sc) => {
      return {
        ...sc,
        conditionCode: conditionCodes.find(
          (cc) => cc.id === sc.conditionCodeID,
        ),
      };
    });
  }

  const extServTemp = {
    eCust: eCustTemp,
    eProg: eProgTemp,
    service,
    serviceCode: {
      ...serviceCode,
      programCode: {
        ...serviceCode.programCode,
        programPriceTable,
      },
    },
    discountCode,
    callAhead,
    serviceConditions: matchedServiceConditions,
  };
  return extServTemp;
}
```

### 7.5 Selectors

**`makeCustBatchExtCustSelector.ts`**
```typescript
import { BatchId } from "@/features/custBatch/types/BatchId";
import { AppState } from "@/store/index.types";
import { discountCodeSelectors } from "@/realGreen/discountCode/discountCodeSelectors";
import { taxCodeSelectors } from "@/realGreen/taxCode/taxCodeSelectors";
import { custFlagSelectors } from "@/realGreen/custFlag/custFlagSelectors";
import { flagsSelectors } from "@/realGreen/flag/flagSelectors";
import { progServSelectors } from "@/realGreen/progServ/progServSelectors";
import { programPriceTablesSelectors } from "@/realGreen/priceTable/programPriceTable/programPriceTablesSelectors";
import { createSelector } from "@reduxjs/toolkit";
import { extCustFunc } from "@/features/custBatch/buildExtCusts/buildExtCusts";
import _ from "lodash";
import { callAheadsSelectors } from "@/realGreen/callAhead/callAheadsSelectors";
import { ExtCust } from "@/features/custBatch/types/ExtCust.types";
import { serviceConditionSelectors } from "@/realGreen/serviceCondition/serviceConditionSelector";
import { conditionCode_ss } from "@/realGreen/conditionCode/selectors/conditionCode_ss";

// function circularizeExtCusts(extCustArray: ExtCust[]): ExtCust[] {
//   const clonedArray = _.cloneDeep(extCustArray);
//   clonedArray.forEach((extCust) => {
//     extCust.programs.forEach((extProg) => {
//       // Attach the parent ExtCust reference to each ExtProg
//       extProg.eCust = extCust;
//
//       extProg.services.forEach((extServ) => {
//         // Attach the parent ExtProg reference to each ExtServ
//         extServ.eProg = extProg;
//
//         // Attach the parent ExtCust reference to each ExtServ
//         extServ.eCust = extCust;
//       });
//     });
//   });
//   return clonedArray;
// }

export function makeCustBatchExtCustSelector(batchId: BatchId) {
  const selectCustomers = (state: AppState) =>
    state.custBatch[batchId].customers;
  const selectPrograms = (state: AppState) => state.custBatch[batchId].programs;
  const selectServices = (state: AppState) => state.custBatch[batchId].services;
  const discountCodes = discountCodeSelectors.discountCodes;
  const taxCodes = taxCodeSelectors.taxCodes;
  const custFlags = custFlagSelectors.custIdFlagIds;
  const flags = flagsSelectors.flags;
  const programCodes = progServSelectors.programCodes;
  const serviceCodes = progServSelectors.serviceCodes;
  const programPriceTables = programPriceTablesSelectors.programPriceTables;
  const callAheads = callAheadsSelectors.callAheads;
  const conditionCodes = conditionCode_ss.conditionCodes_ms;
  const serviceConditions = serviceConditionSelectors.serviceConditions;

  const extCustSelector = createSelector(
    [
      selectCustomers,
      selectPrograms,
      selectServices,
      discountCodes,
      taxCodes,
      custFlags,
      flags,
      programCodes,
      serviceCodes,
      programPriceTables,
      callAheads,
      conditionCodes,
      serviceConditions,
    ],
    (
      customers,
      programs,
      services,
      discountCodes,
      taxCodes,
      custFlags,
      flags,
      programCodes,
      serviceCodes,
      programPriceTables,
      callAheads,
      conditionCodes,
      serviceConditions,
    ) => {
      const extCusts = extCustFunc.build({
        customers,
        programs,
        services,
        options: {
          hydrateDiscountCodes: discountCodes,
          hydrateTaxCodes: taxCodes,
          hydrateFlags: {
            custFlags,
            flags,
          },
          hydrateProgramCodes: programCodes,
          hydrateServiceCodes: serviceCodes,
          hydratePriceTables: programPriceTables,
          hydrateCallAheads: callAheads,
          hydrateServiceConditions: {
            conditionCodes,
            serviceConditions,
          },
        },
      });

      return extCusts;
    },
  );

  // const circularizedExtCustSelector = createSelector(
  //   [extCustSelector],
  //   (extCusts) => {
  //     const circularized = circularizeExtCusts(extCusts);
  //     return circularized;
  //   },
  // );

  return extCustSelector;
  // return { extCustSelector, circularizedExtCustSelector };
}
```

**`custBatch_ss.ts`**
```typescript
import { BatchId } from "@/features/custBatch/types/BatchId";
import { makeCustBatchSubStateSelectors } from "@/features/custBatch/selectors/makeCustBatchSubStateSelectors";

export const custBatch_ss = {
  [BatchId.ACTIVE]: makeCustBatchSubStateSelectors(BatchId.ACTIVE),
  [BatchId.PRINTED]: makeCustBatchSubStateSelectors(BatchId.PRINTED),
  [BatchId.SINGLE]: makeCustBatchSubStateSelectors(BatchId.SINGLE),
  [BatchId.PROD_DATE]: makeCustBatchSubStateSelectors(BatchId.PROD_DATE),
};
```

**`makeCustBatchSubStateSelectors.ts`**
```typescript
import { createSelector } from "@reduxjs/toolkit";
import { BatchId } from "@/features/custBatch/types/BatchId";
import { makeCustBatchLoadingSelectors } from "@/features/custBatch/selectors/makeCustBatchLoadingSelectors";
import { makeCustBatchExtCustSelector } from "@/features/custBatch/selectors/makeCustBatchExtCustSelector";
import { Progress } from "@/features/custBatch/custBatchSlice";
import { createSubStateSelector } from "@/features/custBatch/util/createSubStateSelector";
import memoize from "lodash/memoize";

const settingsProvided_s = createSubStateSelector("settingsProvided");
const progress_s = createSubStateSelector("progress");
const autoLoad_s = createSubStateSelector("autoLoad");

const prelimSearch_s = createSubStateSelector("prelimSearch");
const prelimCustIds_s = createSubStateSelector("prelimCustIds");

const custFields_s = createSubStateSelector("custFields");
const baseCustSearch_s = createSubStateSelector("baseCustSearch");
const custSearch_s = createSubStateSelector("custSearch");
const custInitialized_s = createSubStateSelector("custInitialized");
const customers_s = createSubStateSelector("customers");

const progFields_s = createSubStateSelector("progFields");
const progSearch_s = createSubStateSelector("progSearch");
const progInitialized_s = createSubStateSelector("progInitialized");
const programs_s = createSubStateSelector("programs");

const servFields_s = createSubStateSelector("servFields");
const servSearch_s = createSubStateSelector("servSearch");
const servInitialized_s = createSubStateSelector("servInitialized");
const services_s = createSubStateSelector("services");

const errorCustomers_s = createSubStateSelector("custSearchError");
const errorPrograms_s = createSubStateSelector("progSearchError");
const errorServices_s = createSubStateSelector("servSearchError");

const error = memoize((batchId: BatchId) => {
  // Use reselect to create the combined selector
  return createSelector(
    [
      errorCustomers_s(batchId), // Selector for customer errors
      errorPrograms_s(batchId), // Selector for program errors
      errorServices_s(batchId), // Selector for service errors
    ],
    (custError, progError, servError) => custError || progError || servError, // Combine the errors
  );
});

const canFetchCustomers_s = memoize((batchId: BatchId) =>
  createSelector(
    [progress_s(batchId), settingsProvided_s(batchId)],
    (progress, settingsProvided) => {
      return (
        (progress === Progress.UNINITIALIZED ||
          progress === Progress.FINISHED) &&
        settingsProvided
      );
    },
  ),
);

export const makeCustBatchSubStateSelectors = memoize((batchId: BatchId) => {
  const { loading, loadingMessage } = makeCustBatchLoadingSelectors(batchId);
  const extCustSelector = makeCustBatchExtCustSelector(batchId);

  const extProgs = createSelector([extCustSelector], (extCusts) => {
    return extCusts.flatMap((extCust) => {
      return extCust.programs.map((extProg) => {
        const extCustCopy = { ...extCust };
        return {
          ...extProg,
          eCust: extCustCopy,
        };
      });
    });
  });

  const extServs = createSelector([extProgs], (extProgs) => {
    return extProgs.flatMap((extProg) => {
      return extProg.services.map((extServ) => {
        const extProgCopy = { ...extProg };
        const extCustCopy = { ...extProg.eCust };
        return {
          ...extServ,
          eProg: extProgCopy,
          eCust: extCustCopy,
        };
      });
    });
  });
  return {
    settingsProvided: settingsProvided_s(batchId),
    progress: progress_s(batchId),
    autoLoad: autoLoad_s(batchId),

    prelimSearch: prelimSearch_s(batchId),
    prelimCustIds: prelimCustIds_s(batchId),

    custFields: custFields_s(batchId),
    baseCustSearch: baseCustSearch_s(batchId),
    custSearch: custSearch_s(batchId),
    custInitialized: custInitialized_s(batchId),
    customers: customers_s(batchId),

    progFields: progFields_s(batchId),
    progSearch: progSearch_s(batchId),
    progInitialized: progInitialized_s(batchId),
    programs: programs_s(batchId),

    servFields: servFields_s(batchId),
    servSearch: servSearch_s(batchId),
    servInitialized: servInitialized_s(batchId),
    services: services_s(batchId),

    loading,
    loadingMessage,
    error: error,
    extCusts: extCustSelector,
    extProgs,
    extServs,

    canFetchCustomers_s: canFetchCustomers_s(batchId),
  };
});
```

**`makeCustBatchLoadingSelectors.ts`**
```typescript
import { AppState } from "@/store/index.types";
import { createSelector } from "@reduxjs/toolkit";
import { custFlagSelectors } from "@/realGreen/custFlag/custFlagSelectors";
import { flagsSelectors } from "@/realGreen/flag/flagSelectors";
import { taxCodeSelectors } from "@/realGreen/taxCode/taxCodeSelectors";
import { discountCodeSelectors } from "@/realGreen/discountCode/discountCodeSelectors";
import { BatchId } from "@/features/custBatch/types/BatchId";
import { callAheadsSelectors } from "@/realGreen/callAhead/callAheadsSelectors";
import { serviceConditionSelectors } from "@/realGreen/serviceCondition/serviceConditionSelector";
import { conditionCode_ss } from "@/realGreen/conditionCode/selectors/conditionCode_ss";

export const makeCustBatchLoadingSelectors = (batchId: BatchId) => {
  // Batch-specific internal selectors
  const loadingCustomers = (state: AppState) =>
    state.custBatch[batchId].custSearchLoading;

  const loadingPrograms = (state: AppState) =>
    state.custBatch[batchId].progSearchLoading;

  const loadingServices = (state: AppState) =>
    state.custBatch[batchId].servSearchLoading;

  const loadingCustomersMsg = (state: AppState) =>
    state.custBatch[batchId].custSearchMessage;

  const loadingProgramsMsg = (state: AppState) =>
    state.custBatch[batchId].progSearchMessage;

  const loadingServicesMsg = (state: AppState) =>
    state.custBatch[batchId].servSearchMessage;

  // Composite selector for `loading` (scoped to a specific batchId)
  const loading = createSelector(
    [
      flagsSelectors.loading, // Global static selector
      taxCodeSelectors.loading, // Global static selector
      discountCodeSelectors.loading, // Global static selector
      custFlagSelectors.loading, // Global static selector
      callAheadsSelectors.loading,
      conditionCode_ss.loading,
      serviceConditionSelectors.loading,
      loadingCustomers, // Batch-specific
      loadingPrograms, // Batch-specific
      loadingServices, // Batch-specific
    ],
    (
      flagsLoading,
      taxCodesLoading,
      discountCodesLoading,
      custFlagLoading,
      callAheadsLoading,
      conditionCodeLoading,
      serviceConditionLoading,
      custLoading,
      progLoading,
      servLoading,
    ) => {
      return (
        flagsLoading ||
        taxCodesLoading ||
        discountCodesLoading ||
        callAheadsLoading ||
        custFlagLoading ||
        conditionCodeLoading ||
        serviceConditionLoading ||
        custLoading ||
        progLoading ||
        servLoading
      );
    },
  );

  // Composite selector for `loadingMsg` (scoped to a specific batchId)
  const loadingMessage = createSelector(
    [
      flagsSelectors.loadingMessage, // Global static selector
      taxCodeSelectors.loadingMessage, // Global static selector
      discountCodeSelectors.loadingMessage, // Global static selector
      custFlagSelectors.loadingMessage, // Global static selector
      callAheadsSelectors.loadingMessage,
      conditionCode_ss.loadingMessage,
      serviceConditionSelectors.loadingMessage,
      loadingCustomersMsg, // Batch-specific
      loadingProgramsMsg, // Batch-specific
      loadingServicesMsg, // Batch-specific
    ],
    (
      flagsMsg,
      taxCodesMsg,
      discountCodesMsg,
      custFlagsMsg,
      callAheadsMsg,
      conditionCodeMsg,
      serviceConditionMsg,
      custMsg,
      progMsg,
      servMsg,
    ) => {
      return (
        flagsMsg ||
        taxCodesMsg ||
        discountCodesMsg ||
        custFlagsMsg ||
        callAheadsMsg ||
        conditionCodeMsg ||
        serviceConditionMsg ||
        custMsg ||
        progMsg ||
        servMsg
      );
    },
  );

  return {
    loading,
    loadingMessage,
  };
};
```

### 7.6 State & Utils

**`custBatchSlice.ts`**
```typescript
import { Customer, usedCustomerFields } from "@/realGreen/types/Customer";
import { Program, usedProgramFields } from "@/realGreen/types/Program";
import { Service, usedServiceFields } from "@/realGreen/types/Service";
import { BatchId } from "@/features/custBatch/types/BatchId";
import { CustomerSearch } from "@/realGreen/types/CustomerSearch";
import { ProgramSearch } from "@/realGreen/types/ProgramSearch";
import { ServiceSearch } from "@/realGreen/types/ServiceSearch";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { searchCustThunk } from "@/features/custBatch/thunks/searchCustThunk";
import { searchProgThunk } from "@/features/custBatch/thunks/searchProgThunk";
import { searchServThunk } from "@/features/custBatch/thunks/searchServThunk";
import { getSingleCustProgServThunk } from "@/features/custBatch/thunks/getSingleCustProgServThunk";
import { deepEqual } from "@/utils/stateManagement/deepEqual";
import { hasAnyDefinedKeys } from "@/utils/primitaves/typeGuard";

export type SingleCustProgServ = {
  customer: Customer;
  programs: Program[];
  services: Service[];
};

export enum Progress {
  ERROR = "ERROR",
  UNINITIALIZED = "UNINITIALIZED",
  CHECK_FOR_PRELIM_SEARCH = "CHECK_FOR_PRELIM_SEARCH",
  EXECUTE_PRELIM_SEARCH = "EXECUTE_PRELIM_SEARCH",
  EXECUTE_CUST_SEARCH = "EXECUTE_CUST_SEARCH",
  EXECUTE_PROG_SEARCH = "EXECUTE_PROG_SEARCH",
  EXECUTE_SERV_SEARCH = "EXECUTE_SERV_SEARCH",
  FINISHED = "FINISHED",
}

export type ServPrelim = {
  searchType: "service";
  serviceSearch: ServiceSearch;
};

export type ProgPrelim = {
  searchType: "program";
  programSearch: ProgramSearch;
};

export type FieldSettings = {
  custFields: (keyof Customer)[];
  progFields: (keyof Program)[];
  servFields: (keyof Service)[];
};

export type SearchSettings = {
  autoLoad: boolean;
  prelimSearch: ServPrelim | ProgPrelim | null;
  baseCustSearch: CustomerSearch | null;
  progSearch: ProgramSearch | null;
  servSearch: ServiceSearch | null;
};

export type SubState = FieldSettings &
  SearchSettings & {
    settingsProvided: boolean;
    progress: Progress;

    prelimCustIds: number[];

    custSearch: CustomerSearch | null;
    custInitialized: boolean;
    customers: Customer[];

    progInitialized: boolean;
    programs: Program[];

    servInitialized: boolean;
    services: Service[];

    single: SingleCustProgServ | undefined;

    custSearchLoading: boolean;
    custSearchError: string;
    custSearchMessage: string;

    progSearchLoading: boolean;
    progSearchError: string;
    progSearchMessage: string;

    servSearchLoading: boolean;
    servSearchError: string;
    servSearchMessage: string;
  };

export const createInitialCustProgState = () => {
  const state: SubState = {
    settingsProvided: false,
    progress: Progress.UNINITIALIZED,
    autoLoad: false,

    prelimSearch: null,
    prelimCustIds: [],

    custFields: usedCustomerFields,
    baseCustSearch: null,
    custSearch: null,
    custInitialized: false,
    customers: [],

    progFields: usedProgramFields,
    progSearch: null,
    progInitialized: false,
    programs: [],

    servFields: usedServiceFields,
    servSearch: null,
    servInitialized: false,
    services: [],

    single: undefined,

    custSearchLoading: false,
    progSearchLoading: false,
    servSearchLoading: false,

    custSearchError: "",
    progSearchError: "",
    servSearchError: "",

    custSearchMessage: "",
    progSearchMessage: "",
    servSearchMessage: "",
  };
  return state;
};

type CustBatchState = {
  ACTIVE: SubState;
  PRINTED: SubState;
  SINGLE: SubState;
  PROD_DATE: SubState;
};

const initialState: CustBatchState = {
  ACTIVE: createInitialCustProgState(),
  PRINTED: createInitialCustProgState(),
  SINGLE: createInitialCustProgState(),
  PROD_DATE: createInitialCustProgState(),
};

const custBatchSlice = createSlice({
  name: "custBatch",
  initialState,
  reducers: {
    updateBatch: (
      state,
      action: PayloadAction<{
        batchId: BatchId;
        updates: Partial<SubState>;
      }>,
    ) => {
      const { batchId, updates } = action.payload;
      if (state[batchId]) {
        state[batchId] = { ...state[batchId], ...updates };
      }
    },
    setFieldSettings: (
      state,
      action: PayloadAction<{
        batchId: BatchId;
        fieldSettings: FieldSettings;
      }>,
    ) => {
      const { batchId, fieldSettings } = action.payload;
      const subState = state[batchId];
      const { custFields, progFields, servFields } = fieldSettings;
      if (!deepEqual(subState.custFields, custFields)) {
        subState.custFields = custFields;
      }
      if (!deepEqual(subState.progFields, progFields)) {
        subState.progFields = progFields;
      }
      if (!deepEqual(subState.servFields, servFields)) {
        subState.servFields = servFields;
      }
    },
    setSearchSettings: (
      state,
      action: PayloadAction<{
        batchId: BatchId;
        searchSettings: SearchSettings;
      }>,
    ) => {
      const { batchId, searchSettings } = action.payload;
      const subState = state[batchId];
      const { autoLoad, prelimSearch, baseCustSearch, progSearch, servSearch } =
        searchSettings;
      if (!subState.autoLoad === autoLoad) {
        subState.autoLoad = autoLoad;
      }
      let validPrelimSearch = true;
      if (!deepEqual(subState.prelimSearch, prelimSearch)) {
        if (prelimSearch) {
          switch (prelimSearch.searchType) {
            case "service": {
              validPrelimSearch = hasAnyDefinedKeys(prelimSearch.serviceSearch);
              subState.prelimSearch = prelimSearch;
              break;
            }
            case "program": {
              validPrelimSearch = hasAnyDefinedKeys(prelimSearch.programSearch);
              subState.prelimSearch = prelimSearch;
              break;
            }
          }
        }
      }
      let validBaseCustSearch = true;
      if (!deepEqual(subState.baseCustSearch, baseCustSearch)) {
        validBaseCustSearch = hasAnyDefinedKeys(baseCustSearch);
        subState.baseCustSearch = baseCustSearch;
      }
      let validProgSearch = true;
      if (!deepEqual(subState.progSearch, progSearch)) {
        validProgSearch = hasAnyDefinedKeys(progSearch);
        subState.progSearch = progSearch;
      }
      let validServSearch = true;
      if (!deepEqual(subState.servSearch, servSearch)) {
        validServSearch = hasAnyDefinedKeys(servSearch);
        subState.servSearch = servSearch;
      }
      subState.settingsProvided =
        validPrelimSearch &&
        validBaseCustSearch &&
        validProgSearch &&
        validServSearch;
    },
  },
  extraReducers: (builder) => {
    // Customer Search Builder
    builder.addCase(searchCustThunk.pending, (state, action) => {
      const { batchId } = action.meta.arg;
      const subState = state[batchId];
      subState.custSearchLoading = true;
      subState.custSearchMessage = "Loading customers...";
      subState.custSearchError = "";
    });
    builder.addCase(searchCustThunk.rejected, (state, action) => {
      const { batchId } = action.meta.arg;
      const subState = state[batchId];
      subState.custSearchLoading = false;
      subState.custSearchMessage = "";
      subState.custSearchError = action.payload as string;
    });
    builder.addCase(searchCustThunk.fulfilled, (state, action) => {
      if (!action.payload) return;
      const customers = action.payload;
      const { batchId } = action.meta.arg;
      const subState = state[batchId];

      if (subState.progress === Progress.EXECUTE_CUST_SEARCH) {
        subState.progSearch = {
          ...subState.progSearch,
          customerNumber: customers.map((cust) => cust.id),
        };
        subState.progress =
          customers.length > 0
            ? Progress.EXECUTE_PROG_SEARCH
            : Progress.FINISHED;
      }

      subState.customers = action.payload;
      subState.custSearchLoading = false;
      subState.custSearchMessage = "";
      subState.custSearchError = "";
    });

    // Program Search Builder
    builder.addCase(searchProgThunk.pending, (state, action) => {
      const { batchId } = action.meta.arg;
      const subState = state[batchId];
      subState.progSearchLoading = true;
      subState.progSearchMessage = "Loading programs...";
      subState.progSearchError = "";
    });
    builder.addCase(searchProgThunk.rejected, (state, action) => {
      const { batchId } = action.meta.arg;
      const subState = state[batchId];
      subState.progSearchLoading = false;
      subState.progSearchMessage = "";
      subState.progSearchError = action.payload as string;
    });
    builder.addCase(searchProgThunk.fulfilled, (state, action) => {
      if (!action.payload) return;
      const programs = action.payload;
      const { batchId } = action.meta.arg;
      const subState = state[batchId];

      if (subState.progress === Progress.EXECUTE_PROG_SEARCH) {
        subState.servSearch = {
          ...subState.servSearch,
          programID: programs.map((prog) => prog.id),
        };
        subState.progress =
          programs.length > 0
            ? Progress.EXECUTE_SERV_SEARCH
            : Progress.FINISHED;
      }

      subState.programs = action.payload;
      subState.progSearchLoading = false;
      subState.progSearchMessage = "";
      subState.progSearchError = "";
    });

    // Service Search Builder
    builder.addCase(searchServThunk.pending, (state, action) => {
      const { batchId } = action.meta.arg;
      const subState = state[batchId];
      subState.servSearchLoading = true;
      subState.servSearchMessage = "Loading services...";
      subState.servSearchError = "";
    });
    builder.addCase(searchServThunk.rejected, (state, action) => {
      const { batchId } = action.meta.arg;
      const subState = state[batchId];
      subState.servSearchLoading = false;
      subState.servSearchMessage = "";
      subState.servSearchError = action.payload as string;
    });
    builder.addCase(searchServThunk.fulfilled, (state, action) => {
      const { batchId } = action.meta.arg;
      const subState = state[batchId];
      if (!action.payload) return;

      if (!Array.isArray(action.payload)) {
        // then action.payload is a CustomerSearch object

        if (subState.progress === Progress.EXECUTE_PRELIM_SEARCH) {
          const customerSearch = action.payload;
          const custIds = customerSearch.customerID;
          if (!customerSearch || !custIds) {
            subState.progress = Progress.ERROR;
            subState.servSearchError =
              "Error retrieving custIds from preliminary service search";
          } else {
            subState.prelimCustIds = custIds;
            subState.custSearch = {
              ...subState.baseCustSearch,
              customerID: custIds,
            };
            subState.progress =
              custIds.length > 0
                ? Progress.EXECUTE_CUST_SEARCH
                : Progress.FINISHED;
          }
        }
      } else {
        subState.services = action.payload;
        if (subState.progress === Progress.EXECUTE_SERV_SEARCH) {
          subState.progress = Progress.FINISHED;
        }
      }

      subState.servSearchLoading = false;
      subState.servSearchMessage = "";
      subState.servSearchError = "";
    });

    //Get Single
    builder.addCase(getSingleCustProgServThunk.pending, (state, action) => {
      const batchId = action.meta.arg.batchId;
      const subState = state[batchId];
      subState.custSearchLoading = true;
      subState.custSearchMessage = "Loading customer data...";
      subState.custSearchError = "";
    });
    builder.addCase(getSingleCustProgServThunk.rejected, (state, action) => {
      const batchId = action.meta.arg.batchId;
      const subState = state[batchId];
      subState.custSearchLoading = false;
      subState.custSearchMessage = "";
      subState.custSearchError = action.payload as string;
    });
    builder.addCase(getSingleCustProgServThunk.fulfilled, (state, action) => {
      const batchId = action.meta.arg.batchId;
      const subState = state[batchId];
      const payload = action.payload;

      if (!payload) {
        subState.customers = subState.customers.filter(
          (cust) => cust.id !== action.meta.arg.custId,
        );
        subState.programs = subState.programs.filter(
          (prog) => prog.customerNumber !== action.meta.arg.custId,
        );
        subState.services = subState.services.filter(
          (serv) => serv.customerNumber !== action.meta.arg.custId,
        );
      }

      if (payload) {
        subState.customers = subState.customers.map((cust) => {
          if (cust.id === payload.customer.id) {
            return payload.customer;
          } else {
            return cust;
          }
        });
        const newPrograms = subState.programs
          .filter((p) => p.customerNumber !== payload.customer.id)
          .concat(payload.programs);
        const newServices = subState.services
          .filter((s) => s.customerNumber !== payload.customer.id)
          .concat(payload.services);
        subState.programs = newPrograms;
        subState.services = newServices;
      }

      subState.custSearchLoading = false;
      subState.custSearchMessage = "";
      subState.custSearchError = "";
      subState.single = action.payload;
    });
  },
});

export default custBatchSlice.reducer;
export const custBatchActions = {
  ...custBatchSlice.actions,
  fetchCustomers: searchCustThunk,
  fetchPrograms: searchProgThunk,
  fetchServices: searchServThunk,
  getSingle: getSingleCustProgServThunk,
};
```

**`singleCustValidator.ts`**
```typescript
import { Customer } from "@/realGreen/types/Customer";
import {
  CustomerSearch,
  decimalIsInDecimalRange,
  stringIsInStringRange,
} from "@/realGreen/types/CustomerSearch";

export const singleCustValidator = (
  customer: Customer,
  search: CustomerSearch,
) => {
  const { customerStatus, customerSize } = search;
  if (customerSize && !decimalIsInDecimalRange(customer.size, customerSize)) {
    return false;
  }

  if (
    customerStatus &&
    !stringIsInStringRange(customer.statusCharacter, customerStatus)
  ) {
    return false;
  }

  return true;
};
```

**`createSubStateSelector.ts`**
```typescript
import { createSelector } from "@reduxjs/toolkit";
import { AppState } from "@/store/index.types";
import { BatchId } from "@/features/custBatch/types/BatchId";
import { SubState } from "@/features/custBatch/custBatchSlice";

// Automatically infer the return type of the selector
export const createSubStateSelector = <K extends keyof SubState>(key: K) => {
  // Precompute selectors for all BatchIds
  const selectors: Record<BatchId, (state: AppState) => SubState[K]> =
    Object.values(BatchId).reduce(
      (acc, batchId) => {
        acc[batchId] = createSelector(
          [(state: AppState) => state.custBatch[batchId]],
          (subState) => subState[key],
        );
        return acc;
      },
      {} as Record<BatchId, (state: AppState) => SubState[K]>,
    );

  // Return a selector factory that retrieves the precomputed selector
  return (batchId: BatchId) => selectors[batchId];
};

/**
 * Create a batch-specific derived selector for `state.custBatch`, with fine-grained dependencies.
 *
 * @param batchId - The batch ID for which the selector is created.
 * @param dependencyExtractor - Function to extract dependencies from the batch sub-state.
 * @param deriveFn - Function that computes derived state using the extracted dependencies.
 * @returns A memoized selector for the specific `batchId`.
 */
// export const createBatchDerivedSelector = <
//   Deps extends readonly unknown[],
//   Result,
// >(
//   batchId: BatchId,
//   dependencyExtractor: (subState: SubState) => Deps,
//   deriveFn: (...dependencies: Deps) => Result,
// ) => {
//   console.log("creating batch derived selector for batchId: ", {
//     batchId,
//     dependencyExtractor,
//   });
//   return createSelector(
//     [(state: AppState) => dependencyExtractor(state.custBatch[batchId])],
//     (dependencies) => deriveFn(...(dependencies as Deps)),
//   );
// };
```

### 7.7 Types

**`BatchId.ts`**
```typescript
/** used to enforce standardized batchIds both in custProgServ state, and
 * as well as search optimization being saved to db with fetchCount.
 * @ACTIVE intended for active customers, active programs, and active services
 * @PRINTED intended for active customers with printed service(s).  All
 * programs and active services will be loaded to provide history and future service
 * data.
 * @PROD_DATE intended to retrieve customers who were serviced on a given date,
 * managed by useProdDate. Loads all active programs and services.
 *
 * ### To add a batch:
 *  - Make a new id
 *  - Modify CustBatchState with the new id
 *  - Modify InitialState with the new id
 *  - Modify custBatch_ss with the new id
 */

export enum BatchId {
  ACTIVE = "ACTIVE",
  PRINTED = "PRINTED",
  SINGLE = "SINGLE",
  PROD_DATE = "PROD_DATE",
}
```

**`custBatchTypes.ts`**
```typescript
import { BatchId } from "@/features/custBatch/types/BatchId";
import { CustomerSearch } from "@/realGreen/types/CustomerSearch";
import { Customer } from "@/realGreen/types/Customer";
import { ProgramSearch } from "@/realGreen/types/ProgramSearch";
import { Program } from "@/realGreen/types/Program";
import { ServiceSearch } from "@/realGreen/types/ServiceSearch";
import { Service } from "@/realGreen/types/Service";

export type SearchCustPost = {
  search: CustomerSearch;
  fields: (keyof Customer)[];
};

export type SearchProgPost = {
  search: ProgramSearch;
  fields: (keyof Program)[];
};

export type SearchServPost = {
  search: ServiceSearch;
  fields: (keyof Service)[];
};

export type CustSearchThunkParams = SearchCustPost & {
  batchId: BatchId;
  fetchMethod: "" | "fetchCount" | "byId";
};

export type ProgSearchThunkParams = SearchProgPost & {
  batchId: BatchId;
  fetchMethod: "" | "fetchCount" | "byId" | "byCustomerId";
};

export type ServSearchThunkParams = SearchServPost & {
  batchId: BatchId;
  fetchMethod: "" | "fetchCount" | "byId" | "byProgramId" | "preliminary";
};

export type GetSingleCPSParams = {
  batchId: BatchId;
  custId: number;
  custSearch: CustomerSearch;
  progSearch: ProgramSearch;
  servSearch: ServiceSearch;
  custFields: (keyof Customer)[];
  progFields: (keyof Program)[];
  servFields: (keyof Service)[];
  // validator?: (customer: Customer) => boolean;
};
```

**`ExtCust.types.ts`**
```typescript
import { DiscountCode } from "@/realGreen/types/DiscountCode";
import { Program } from "@/realGreen/types/Program";
import { ProgramCode } from "@/realGreen/types/ProgramCode";
import { IProgramPriceTable } from "@/models/ProgramPriceTable.types";
import { CallAhead } from "@/realGreen/types/CallAhead";
import { Customer } from "@/realGreen/types/Customer";
import { Flag } from "@/realGreen/types/Flag";
import { TaxCode } from "@/realGreen/types/TaxCode";
import { IAssignment } from "@/models/Assignment.types";
import { Service } from "@/realGreen/types/Service";
import { IServCode } from "@/realGreen/progServ/models/ExtServCode.types";
import { ServiceCondition } from "@/realGreen/types/ServiceCondition";
import { Position } from "@/features/googleMap/types/MapTypes";

export type ExtServ = {
  assignment?: IAssignment;
  discountCode: DiscountCode | undefined;
  eCust: ExtCust;
  eProg: ExtProg;
  service: Service;
  serviceCode: IServCode;
  callAhead: CallAhead | undefined;
  serviceConditions: ServiceCondition[];
};
export type ExtProg = {
  eCust: ExtCust;
  discountCode: DiscountCode | undefined;
  program: Program;
  programCode: ProgramCode;
  services: ExtServ[];
  priceTable?: IProgramPriceTable;
  callAhead: CallAhead | undefined;
};
export type ExtCust = {
  customer: Customer;
  discountCode: DiscountCode | undefined;
  flags: Flag[];
  programs: ExtProg[];
  taxCodes: TaxCode[];
  callAhead: CallAhead | undefined;
  position: Position;
};
```

**`buildExtCusts.types.ts`**
```typescript
import {
  ExtCust,
  ExtProg,
  ExtServ,
} from "@/features/custBatch/types/ExtCust.types";
import { CallAhead } from "@/realGreen/types/CallAhead";
import { IServCode } from "@/realGreen/progServ/models/ExtServCode.types";
import { ProgramCode } from "@/realGreen/types/ProgramCode";
import { DiscountCode } from "@/realGreen/types/DiscountCode";
import { TaxCode } from "@/realGreen/types/TaxCode";
import { Flag } from "@/realGreen/types/Flag";
import { IProgramPriceTable } from "@/models/ProgramPriceTable.types";
import { ConditionCode } from "@/realGreen/types/ConditionCode";
import { ServiceCondition } from "@/realGreen/types/ServiceCondition";

export type ExtServTemp = Omit<
  ExtServ,
  "eProg" | "eCust" | "serviceCode" | "callAhead"
> & {
  eProg: ExtProgTemp | undefined;
  eCust: ExtCustTemp | undefined;
  serviceCode: IServCode | undefined;
  callAhead: CallAhead | undefined;
};
export type ExtProgTemp = Omit<
  ExtProg,
  "eCust" | "programCode" | "services" | "callAhead"
> & {
  eCust: ExtCustTemp | undefined;
  programCode: ProgramCode | undefined;
  services: ExtServTemp[];
  callAhead: CallAhead | undefined;
};
export type ExtCustTemp = Omit<ExtCust, "programs" | "callAhead"> & {
  programs: ExtProgTemp[];
  callAhead: CallAhead | undefined;
};
export type BuildExtCustOptions = {
  hydrateDiscountCodes?: DiscountCode[];
  hydrateTaxCodes?: TaxCode[];
  hydrateProgramCodes?: ProgramCode[];
  hydrateServiceCodes?: IServCode[];
  hydrateFlags?: {
    flags: Flag[];
    custFlags: Map<number, number[]>;
  };
  hydratePriceTables?: IProgramPriceTable[];
  hydrateCallAheads?: CallAhead[];
  hydrateServiceConditions?: {
    conditionCodes: ConditionCode[];
    serviceConditions: ServiceCondition[];
  };
};
```

**`models/FetchCount.types.ts`**
```typescript
export type FetchCountSearchType =
  | "customer"
  | "program"
  | "service"
  | "programByCustomerNumber"
  | "programByCustomerName"
  | "serviceByProgId"
  | "servicePreliminary";

export type IFetchCount = {
  rgSearchId: string;
  searchType: FetchCountSearchType;
  fetchCount: number;
};
```
