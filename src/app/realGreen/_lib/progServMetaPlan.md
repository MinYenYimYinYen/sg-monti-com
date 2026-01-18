# ProgServMeta Refactor Plan

## Context
We are refactoring the `ProgCode`, `ServCode`, and `ProgServ` modules into a unified "Catalog" or "Metadata" system. Currently, these exist as separate slices, which causes synchronization issues and complexity when building the full tree of "Programs containing Services".

We have decided to create a **parallel module** called `progServMeta` to build this new system without breaking the existing legacy code.

## Goal
Create a unified system that:
1.  Fetches `ProgCodes` and `ServCodes` (Metadata).
2.  Fetches the `ProgServ` links (Join Table) efficiently.
3.  Hydrates the tree (`ProgCode -> ServCodes`) on the client.
4.  Uses MongoDB to cache the `ProgServ` links to avoid N+1 API calls to RealGreen.

## Architecture

### 1. Folder Structure
New Module: `src/app/realGreen/progServMeta/`
*   `_lib/`
    *   `models/`: Mongoose models.
    *   `progServBuilder.ts`: Logic to link ProgCodes and ServCodes (Already created).
*   `api/`: API Routes for syncing.
*   `progServMetaSlice.ts`: Redux slice.
*   `useProgServMeta.ts`: Custom hook.

### 2. Data Models
*   **ProgCode**: Existing type in `src/app/realGreen/programCode/ProgCode.ts`.
*   **ServCode**: Existing type in `src/app/realGreen/servCode/ServCode.ts`.
*   **ProgServ**: Existing type in `src/app/realGreen/progServ/ProgServ.ts`.
*   **ProgServModel**: New Mongoose model to store `ProgServ` links.
    *   Schema: `progServId` (unique), `progDefId` (index), `servCodeId` (index), `round`, `isDependent`, `do`, `skipAfter`.
    *   Location: `src/app/realGreen/progServMeta/_lib/models/ProgServModel.ts`.

### 3. API Route (`src/app/realGreen/progServMeta/api/route.ts`)
*   **Contract**: `sync` operation.
    *   Input: `progDefIds: number[]`
    *   Output: `items: ProgServ[]`
*   **Logic**:
    1.  **Check Cache**: Query Mongo for the most recently updated `ProgServ` document.
    2.  **Validate Freshness**: Use `dateCompare` to check if `updatedAt` is < 12 hours old.
    3.  **Return Cached**: If fresh, return all documents from Mongo.
    4.  **Fetch & Sync**: If stale:
        *   Loop through `progDefIds`.
        *   Call RealGreen API (`/ProgramCode/${id}/Services`) for each.
        *   Use `delay(10)` to throttle requests.
        *   **Upsert** results into Mongo `ProgServModel`.
        *   Return the fresh list.

### 4. Redux Slice (`progServMetaSlice.ts`)
*   **State**:
    *   `dryProgCodes`: `ProgCode[]` (Flat list from API)
    *   `dryServCodes`: `ServCode[]` (Flat list from API)
    *   `progServLinks`: `ProgServ[]` (Link table from Sync API)
    *   `loading`: Status flags.
*   **Thunks**:
    *   `fetchDryProgCodes`: Calls existing `programCode/api`.
    *   `fetchDryServCodes`: Calls existing `servCode/api`.
    *   `hydrateProgCodes`:
        1.  Dispatches `fetchDryProgCodes` & `fetchDryServCodes`.
        2.  Extracts `progDefIds`.
        3.  Calls `sync` API to get links.
        4.  Updates all state.
*   **Selectors**:
    *   `selectProgCodes`: Uses `progServBuilder` to combine `dryProgCodes`, `dryServCodes`, and `progServLinks` into a hydrated tree.

### 5. Hook (`useProgServMeta.ts`)
*   Exposes `hydrateProgCodes()` action.
*   Exposes selectors (optional, or use direct `useSelector`).

## Implementation Steps (Remaining)

1.  **Create Model**: `src/app/realGreen/progServMeta/_lib/models/ProgServModel.ts`.
2.  **Create Contract**: `src/app/realGreen/progServMeta/api/ProgServMetaContract.ts`.
3.  **Create API Route**: `src/app/realGreen/progServMeta/api/route.ts` (Implement the Sync logic).
4.  **Create Slice**: `src/app/realGreen/progServMeta/progServMetaSlice.ts`.
5.  **Create Hook**: `src/app/realGreen/progServMeta/useProgServMeta.ts`.
6.  **Verify**: Test the hydration flow.

## Future Considerations
*   **Cron Job**: Eventually, move the `sync` logic to a scheduled task (Vercel Cron) to run at 4 AM, so the user never waits for the "Stale" refresh.
*   **Consolidation**: Once `progServMeta` is stable, deprecate and remove the old `programCode`, `servCode`, and `progServ` folders.
