# RealGreen Entity Architecture

This directory follows a strict "Type Flow" pipeline to handle data ingestion, cleaning, storage, and hydration. This architecture is designed to enforce separation of concerns and ensure type safety across the application.

## Folder Structure

Code for each entity is organized into three distinct subfolders within `_lib/entities/`:

1.  **`types/`**: Pure TypeScript definitions. No runtime logic.
2.  **`bases/`**: Default "Empty" objects for initialization and fallbacks.
3.  **`funcs/`**: Pure functions for data transformation (Remappers, Extenders).

## The 4-Stage Type Pipeline

Data flows through four distinct type stages:

1.  **Raw (`[Entity]Raw`)**
    *   **Source**: External API (RealGreen).
    *   **Characteristics**: Exact shape of the JSON response. All fields (even unused ones), original messy naming, nullable types.
    *   **Location**: `types/[Entity]Types.ts`

2.  **Core (`[Entity]Core`)**
    *   **Source**: Output of `remap[Entity]`.
    *   **Characteristics**: Clean, normalized JavaScript objects. CamelCase field names. Nulls handled/defaulted.
    *   **Location**: `types/[Entity]Types.ts`

3.  **Doc (`[Entity]Doc`)**
    *   **Source**: MongoDB / Redux Store.
    *   **Characteristics**: Intersection of `Core` & `DocProps`. Contains the data plus metadata (`createdAt`, `updatedAt`, `_id`).
    *   **Definition**: `type [Entity]Doc = [Entity]Core & [Entity]DocProps`.
    *   **Location**: `types/[Entity]Types.ts`

4.  **Hydrated (`[Entity]`)**
    *   **Source**: UI Selectors.
    *   **Characteristics**: The `Doc` enriched with relationships (e.g., `Service` containing its `Program`).
    *   **Definition**: `type [Entity] = [Entity]Doc & [Entity]Props`.
    *   **Location**: `types/[Entity]Types.ts`

## Standard Functions (`funcs/`)

*   `remap[Entity](raw: [Entity]Raw): [Entity]Core`
    *   Pure function. Transforms one raw item to one clean core item.
*   `extend[Entity]s(core: [Entity]Core[]): Promise<[Entity]Doc[]>`
    *   Merges the clean core data with database metadata.

## Base Objects (`bases/`)

*   `base[Entity]`: A constant object matching the `[Entity]` type with default empty values.
*   **Usage**:
    *   Initializing state.
    *   Providing safe fallbacks for missing relationships (e.g., `service.program || baseProgram`).

## Selectors

For simple entities (like `ZipCode`), standard Redux selectors are sufficient.

For complex, interconnected entities (like `Customer` -> `Program` -> `Service`), we use the **Context Tree Architecture**.
*   **Goal**: Allow bidirectional navigation (`service.program.services`) without circular dependencies.
*   **Pattern**: Build a "Base Tree" (Top-Down), then wrap nodes in "Context Objects" (Bottom-Up) that provide parent pointers.
*   **Reference**: See `src/app/realGreen/customer/customer.readme.md` for the full Context Tree documentation.

---

## The RealGreen Type Boundary

### The Rule

RealGreen-specific types — `RGStringRange`, `RGNumRange`, `CustStat`, and any type defined in `_lib/subTypes/` that mirrors a RealGreen API shape — are **quarantined**. They are only permitted to exist in two places:

1. **`*Raw` type definitions** — the exact shape of the RealGreen API response or request body
2. **`remap*` and `remapSearch*` functions** — the translation layer that converts between RealGreen types and our types

Everything downstream — `Core`, `Doc`, hydrated entities, selectors, hooks, components, search criteria types — uses **only our types** (`TRange<string>`, `string[]`, etc.).

If you see a RealGreen-specific type imported in a selector, hook, or component, that is a **bug**.

### The Motivation

RealGreen has changed API shapes before and will again. The remap layer is the **single point of adaptation**. When RealGreen changes a field name, a type shape, or a value encoding, we fix it in one function and all downstream code is unaffected.

This is not just a naming convention — it is a **containment strategy** for external API volatility.

### The Search Criteria Pattern

For every RealGreen search endpoint, we define two types and one function:

| Type / Function | Convention | Example |
|---|---|---|
| `*SearchRaw` | Mirrors RealGreen exactly — their field names, their types | `CallLogSearchRaw` with `updated?: RGStringRange` |
| `*SearchCriteria` | Our conventions — our field names, our types | `CallLogSearchCriteria` with `updated?: TRange<string>` |
| `remapSearch*` | The only bridge between the two | `remapCallLogSearch(criteria) → raw` |

Consuming code (hooks, slices, API contracts) always uses `*SearchCriteria`. The `remapSearch*` function is called once, immediately before the `rgApi` call, and its output is never stored or passed further.

### The Write-Back Corollary

When writing data back to RealGreen (future), the same rule applies in reverse:

- Our types go in (e.g., a form value, a `TRange<string>`)
- A `remap*Write` function converts to RealGreen's expected shape at the boundary
- The RealGreen type is constructed inside the remap function and passed directly to `rgApi`
- It is never stored in state or passed to other functions

### Enforcement

The `_lib/subTypes/` directory contains all RealGreen-specific primitive types. Treat imports from this directory as a signal: if you see one outside of a `*Raw` type or a `remap*` function, move the conversion into the remap layer.
