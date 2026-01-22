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
    *   **Source**: MongoDB.
    *   **Characteristics**: These types represent the metadata stored in our local database, such as `createdAt`, `updatedAt`, and the primary key (e.g., `custId`).
    *   **Example**: `CustomerDoc`.

4.  **Pipeline (`[Entity]`)**:
    *   **Source**: The combination of `Core` and `Doc`.
    *   **Characteristics**: This is the primary type used throughout the application pipeline. It represents a fully formed entity with both external data and internal metadata.
    *   **Example**: `Customer` (which is `CustomerCore & CustomerDoc`).

5.  **Hydrated (`[Entity]Hydrated`)**:
    *   **Source**: The UI State (Redux).
    *   **Characteristics**: These objects may contain additional computed fields or relationships needed for the UI (e.g., a Customer object that has an array of its Programs attached).
    *   **Example**: `CustomerHydrated`.

## Technical Debt / Future Improvements

### Search Criteria Remapping
Currently, the "Search Criteria" types (e.g., `CustomerSearchCriteria`) are remapped to the "Raw" API types (e.g., `CustomerSearchRaw`) inside the `searchSchemes.ts` definition.

*   **Issue**: The pipeline logic has to know about `CustomerSearchRaw` types, which leaks implementation details of the external API into the business logic.
*   **Proposed Solution**: Move the remapping logic into the `rgApi` layer or create a wrapper `rgSearch` function. This function would accept a discriminated union of search criteria (e.g., `{ type: 'customer', ...criteria }`) and handle the conversion to the raw API payload internally. This would decouple the pipeline from the raw API shapes.
