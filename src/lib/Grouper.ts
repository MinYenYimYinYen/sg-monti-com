import { AppError } from "@/lib/errors/AppError";

/**
 * A utility class for grouping items in an array and enabling further transformations.
 *
 * @template T Type of the items in the input array.
 */
export class Grouper<T> {
  private items: T[]; // The input items to be grouped.

  /**
   * Constructs a new Grouper instance.
   *
   * @param items The array of items to group and transform.
   */
  constructor(items: T[]) {
    this.items = items;
  }

  /**
   * Transforms and pivots a dataset by linking parent and child relationships into a flattened structure.
   * The result combines properties from individual child items with their associated parents
   * and allows grouping by customizable key fields.
   *
   * @param getChildArray - A function that retrieves the array of child objects for a given parent.
   * @param parentPlural - The key name under which the parent(s) will be stored for each child object in the result.
   * @param childElementId - The unique identifier from the child object used to group child items together.
   * @param additionalKeyFields - (Optional) An array of additional child fields to include in the grouping key for disambiguation.
   *
   * @returns A flattened array of child objects that also include their associated parent(s).
   * Each child object in the resulting array will have a property named by `parentPlural` containing an array of its assigned parents.
   *
   * ## Example:
   *
   * Suppose we want to pivot a dataset containing `ServiceConditions` and their respective `conditionCodes`.
   * Each `ServiceCondition` has a list of `conditionCodes`, and some `conditionCodes` may belong to multiple `ServiceConditions`,
   * resulting in a many-to-many relationship. Here’s how you could use `pivot` to transform the dataset:
   *
   * ```typescript
   * const serviceConditions = [
   *   { id: 1, desc: "Condition A", conditionCodes: [{ id: "C1", name: "Code 1" }, { id: "C2", name: "Code 2" }] },
   *   { id: 2, desc: "Condition B", conditionCodes: [{ id: "C2", name: "Code 2" }, { id: "C3", name: "Code 3" }] },
   * ];
   *
   * const pivotedConditionCodes = new Grouper(serviceConditions).pivot(
   *   (serviceCondition) => serviceCondition.conditionCodes, // Get child (conditionCodes) from each parent (serviceCondition)
   *   "serviceConditions",                                  // The key to store parent objects (serviceConditions)
   *   "id",                                                 // Unique ID of each child (conditionCode)
   *   ["name"]                                              // Any additional key fields (optional)
   * );
   *
   * console.log(pivotedConditionCodes);
   * ```
   *
   * **Output:**
   * ```json
   * [
   *   {
   *     "id": "C1",
   *     "name": "Code 1",
   *     "serviceConditions": [{ "id": 1, "desc": "Condition A" }]
   *   },
   *   {
   *     "id": "C2",
   *     "name": "Code 2",
   *     "serviceConditions": [
   *       { "id": 1, "desc": "Condition A" },
   *       { "id": 2, "desc": "Condition B" }
   *     ]
   *   },
   *   {
   *     "id": "C3",
   *     "name": "Code 3",
   *     "serviceConditions": [{ "id": 2, "desc": "Condition B" }]
   *   }
   * ]
   * ```
   *
   * **Key Notes:**
   * - If multiple parents share the same child, all parents will be included in the `parentPlural` array field (`serviceConditions` in this case).
   * - Use `additionalKeyFields` to disambiguate child items when necessary.
   * - The result guarantees that children are flattened and grouped, with their associated parents included as an array under the specified parent key.
   */
  pivot<NewParent>(
    getChildArray: (parent: T) => NewParent[],
    parentPlural: string,
    childElementId: keyof NewParent,
    additionalKeyFields?: (keyof NewParent)[],
  ): (NewParent & { [p: string]: T[] })[] {
    // Step 1: Store all parents in a Map for quick lookups
    const parentMap = new Map<T, T>();

    this.items.forEach((parent) => {
      parentMap.set(parent, parent); // Or use a unique identifier if needed
    });

    // Step 2: Flatten parent-child relationships without redundant parent copies
    const pivotedItems: Array<NewParent & { [key in typeof parentPlural]: T }> =
      this.items.flatMap((parent) => {
        const children = getChildArray(parent);
        return children.map((child) => {
          const parentReference = parentMap.get(parent);
          if (!parentReference) {
            throw new Error(
              `Parent not found for child: ${child[childElementId]}`,
            );
          }
          return {
            ...child,
            [parentPlural]: parentReference, // Always defined
          };
        });
      });

    // Step 3: Create a unique grouping key (id + additional fields) and merge grouped items
    const groupedPivotedItems = new Grouper(pivotedItems)
      .groupBy((item) => {
        const baseKey = item[childElementId];
        const additionalKey = additionalKeyFields
          ? additionalKeyFields.map((field) => item[field]).join("|")
          : "";
        return `${baseKey}|${additionalKey}`;
      })
      .toArray();

    // Step 4: Merge grouped items into final output
    const result = groupedPivotedItems.map((group) => {
      const { items } = group;
      const itemArray = items.map((item) => item[parentPlural]);

      const mergedItem = {
        ...items[0],
        [parentPlural]: itemArray,
      };

      if (additionalKeyFields) {
        additionalKeyFields.forEach((field) => {
          mergedItem[field] = items[0][field];
        });
      }

      return mergedItem;
    });

    return result as (NewParent & { [p: string]: T[] })[];
  }

  /**
   * Converts the items to a Map with unique keys.
   * Each key maps to a single item in the array.
   *
   * @param getKey A function that takes an item and returns the key for grouping.
   * @returns A Map where each key maps to a single item in the array.
   *
   * Example:
   * ```typescript
   * const grouper = new Grouper(users);
   * const result = grouper.toUniqueMap(user => user.id);
   * // Output: Map(1 => { id: 1, name: 'Alice' }, 2 => { id: 2, name: 'Bob' })
   * ```
   *
   * @throws Error if duplicate keys are detected.
   */
  toUniqueMap<K extends string | number>(getKey: (item: T) => K): Map<K, T> {
    const uniqueMap = new Map<K, T>();

    for (const item of this.items) {
      const key = getKey(item);
      if (uniqueMap.has(key)) {
        // throw new Error(`Duplicate key detected: ${key}`);
        throw new AppError({
          message: "Duplicate key detected: " + key,
          type: "VALIDATION_ERROR",
        });
      }
      uniqueMap.set(key, item);
    }

    return uniqueMap;
  }

  /**
   * Groups the items using the provided key extraction function.
   *
   * @param getKey A function that takes an item and returns the key for grouping.
   * @returns A new GrouperPipeline instance for the grouped data.
   *
   * Example:
   * ```typescript
   * const grouper = new Grouper(users);
   * const pipeline = grouper.groupBy(user => user.id);
   * ```
   */
  groupBy<K extends string | number>(
    getKey: (item: T) => K,
  ): GrouperPipeline<T, K> {
    const groupedData = new Map<K, T[]>(); // Create a new Map to store grouped data.

    // Group items based on the computed key.
    this.items.forEach((item) => {
      const key = getKey(item);
      if (!groupedData.has(key)) {
        groupedData.set(key, []); // Initialize the group if the key doesn't exist.
      }
      groupedData.get(key)!.push(item); // Add the item to the correct group.
    });

    // Return a new instance of the GrouperPipeline class with the grouped data.
    return new GrouperPipeline<T, K>(groupedData);
  }
}

/**
 * A chainable pipeline for transforming grouped data.
 *
 * @template T Type of the items in the grouped data.
 * @template K Type of the key used for grouping.
 */
class GrouperPipeline<T, K extends string | number> {
  private groupedData: Map<K, T[]>; // Stores the grouped data as a Map.

  /**
   * Constructs a new GrouperPipeline instance.
   *
   * @param groupedData The grouped data from the Grouper.
   */
  constructor(groupedData: Map<K, T[]>) {
    this.groupedData = groupedData;
  }

  /**
   * Converts the grouped data into an array of objects.
   * Each object will have a `key` and the `items` belonging to that key.
   *
   * @returns An array of grouped data, with each group represented as:
   *          `{ key: K, items: T[] }`.
   *
   * Example:
   * ```typescript
   * const result = grouperPipeline.toArray();
   * // Output: [{ key: 1, items: [...] }, { key: 2, items: [...] }]
   * ```
   */
  toArray(): Array<{ key: K; items: T[] }> {
    // Convert the Map into an array of { key, items } objects.
    return Array.from(this.groupedData.entries()).map(([key, items]) => ({
      key,
      items,
    }));
  }

  /**
   * Returns the grouped data as a Map.
   * The keys are extracted by the `getKey` function provided to `groupBy`,
   * and the values are arrays of items that belong to each key.
   *
   * @returns The grouped data as a Map.
   *
   * Example:
   * ```typescript
   * const result = grouperPipeline.toMap();
   * // Output: Map(1 => [...], 2 => [...])
   * ```
   */
  toMap(): Map<K, T[]> {
    return this.groupedData; // Return the grouped data as a Map.
  }

  /**
   * Applies a custom transformation to each group and returns an array of results.
   * This is useful for summarizing or computing results for each group.
   *
   * @param getSummary A function that takes a key and the items belonging to that key,
   *                   and returns a transformed summary.
   * @returns An array of transformed group summaries.
   *
   * Example:
   * ```typescript
   * const summaries = grouperPipeline.summarize((key, items) => ({
   *   key,
   *   count: items.length,
   * }));
   * ```
   */
  summarize<R>(getSummary: (key: K, items: T[]) => R): R[] {
    // Apply summary transformation to each group.
    return Array.from(this.groupedData.entries()).map(([key, items]) =>
      getSummary(key, items),
    );
  }
}
