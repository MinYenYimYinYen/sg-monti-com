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
