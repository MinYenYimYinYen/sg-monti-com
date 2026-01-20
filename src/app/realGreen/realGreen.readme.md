# RealGreen Entity Architecture

This directory follows a strict "Type Flow" pipeline to handle data ingestion, cleaning, storage, and hydration.

## The 5-Stage Pipeline

Data flows through five distinct type stages to ensure separation of concerns between the external API, our internal database, and the UI.

1.  **Raw** (`$Entity$Raw`)
    *   **Source**: External API (RealGreen).
    *   **Characteristics**: Exact shape of the JSON response. All fields (even unused ones), original messy naming, nullable types.
    *   **Action**: Input for `remap$Entity$`.

2.  **Remapped** (`$Entity$Remapped`)
    *   **Source**: Output of `remap$Entity$`.
    *   **Characteristics**: Clean, camelCase field names. Nulls handled/defaulted. Data structures transformed (e.g., combining fields).
    *   **Purpose**: The "Pure" data shape used in business logic.

3.  **Mongo** (`$Entity$Mongo`)
    *   **Source**: MongoDB.
    *   **Characteristics**: Extends `CreatedUpdated`. Contains the **Unique ID** to link back to the Source.
    *   **Purpose**: Metadata storage (when was this record first seen/last updated?).

4.  **WithMongo** (`$Entity$WithMongo`)
    *   **Source**: Output of `extend$Entity$s`.
    *   **Characteristics**: Intersection of `Remapped & Mongo`.
    *   **Purpose**: The base entity ready for use, containing clean data + timestamps.
    *   **Efficiency**: Merging must use `Grouper` to ensure **O(N)** complexity.

5.  **Hydrate** (`$Entity$Hydrate`)
    *   **Source**: Application Logic.
    *   **Characteristics**: Contains joined/resolved data (e.g., a `Program` containing its full `Customer` object).
    *   **Final Type**: `type $Entity$ = $Entity$WithMongo & $Entity$Hydrate`.

## Standard Functions

*   `remap$Entity$(raw: $Entity$Raw): $Entity$Remapped`
    *   Pure function. Transforms one raw item to one clean item.
*   `extend$Entity$s({ remapped, mongo }): $Entity$WithMongo[]`
    *   Merges the clean data with database metadata.
    *   **MUST** use `Grouper` to create a hash map of Mongo items before iterating.

## WebStorm Live Template

Use the abbreviation `typeflow` to generate this structure.

**Template Text:**

```typescript
import { CreatedUpdated } from "@/lib/mongoose/mongooseTypes";
import { Grouper } from "@/lib/Grouper";

export type $Entity$Raw = {
  id: $IdType$;
};

export type $Entity$Remapped = {
  $IdField$: $IdType$;
};

export type $Entity$Mongo = CreatedUpdated & {
  $IdField$: $IdType$;
};

export type $Entity$WithMongo = $Entity$Remapped & $Entity$Mongo;

export type $Entity$Hydrate = {}

export type $Entity$ = $Entity$WithMongo & $Entity$Hydrate;

function remap$Entity$(raw: $Entity$Raw): $Entity$Remapped {
  return {
    $IdField$: raw.id,
  } as $Entity$Remapped;
}

export function remap$Entity$s (raw: $Entity$Raw[]) {
  return raw.map((r) => remap$Entity$(r));
}

function extend$Entity$({
  remapped,
  mongo,
}: {
  remapped: $Entity$Remapped;
  mongo?: $Entity$Mongo;
}): $Entity$WithMongo {
  return {
    ...remapped,
    createdAt: mongo?.createdAt || "",
    updatedAt: mongo?.updatedAt || "",
  }
}

export function extend$Entity$s({
  remapped,
  mongo,
}: {
  remapped: $Entity$Remapped[];
  mongo: $Entity$Mongo[];
}): $Entity$WithMongo[] {
  const mongoMap = new Grouper(mongo).toUniqueMap((e) => e.$IdField$ );

  return remapped.map((r) =>
    extend$Entity$({
      remapped: r,
      mongo: mongoMap.get(r.$IdField$),
    }),
  );
}
```

**Variables:**

| Name | Expression | Default value | Skip if defined |
| :--- | :--- | :--- | :--- |
| **Entity** | `capitalize(camelCase(fileNameWithoutExtension()))` | `"Entity"` | ☐ |
| **IdField** | `camelCase(Entity) + "Id"` | `"id"` | ☐ |
| **IdType** | | `"number"` | ☐ |
