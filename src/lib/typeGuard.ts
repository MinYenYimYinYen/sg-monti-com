/**
 * A type guard function that checks if a specific property on an object is defined (i.e., neither `undefined` nor `null`).
 *
 * @param item - The object to check.
 * @param key - The key or keys of the property to validate.
 * @returns boolean {item is T & { [P in K]-?: NonNullable<T[P]> }}
 * - Returns `true` if the property is defined (not `undefined` or `null`), otherwise `false`.
 * - Refines the type of `item` so the specified property is guaranteed to exist and not be nullable.
 *
 * @example
 * interface RawCustomer {
 *   id: number;
 *   callAhead?: { id: string };
 * }
 *
 * const customer: RawCustomer = { id: 1, callAhead: { id: "123" } };
 *
 * if (hasDefined(customer, "callAhead")) {
 *   console.log(customer.callAhead.id); // Safe to access because callAhead is now defined
 * }
 */
function hasDefined<T, K extends keyof T>(
  item: T,
  key: K,
): item is T & { [P in K]-?: NonNullable<T[P]> } {
  return item[key] !== undefined && item[key] !== null;
}

/**
 * Filters an array of objects to include only those where a specific property is defined (i.e., neither `undefined` nor `null`).
 *
 * @param items - The array of objects to filter.
 * @param key - The key of the property to validate.
 * @returns Array
 * - Returns a new array containing only the objects where the specified property is guaranteed to be defined.
 * - Refines the type of the resulting array to ensure the property is present and non-nullable.
 *
 * @example
 * interface RawCustomer {
 *   id: number;
 *   callAhead?: { id: string };
 * }
 *
 * const customers: RawCustomer[] = [
 *   { id: 1, callAhead: { id: "123" } },
 *   { id: 2, callAhead: undefined },
 },
 *   { id: 2, callAhead: undefined },
 *   { id: 3 },
 * ];
 *
 * const validCustomers = withDefined(customers, "callAhead");
 * console.log(validCustomers); // [{ id: 1, callAhead: { id: '123' } }]
 *
 * validCustomers.forEach(cust => {
 *   console.log(cust.callAhead.id); // Safe to access callAhead because it's defined
 * });
 */
function withDefinedKey<T, K extends keyof T>(
  items: T[],
  key: K,
): Array<T & { [P in K]-?: NonNullable<T[P]> }> {
  return items.filter((item) => hasDefined(item, key));
}

/**
 * Filters an array of objects to include only those where all specified properties are defined (i.e., neither `undefined` nor `null`).
 *
 * @param items - The array of objects to filter.
 * @param keys - The keys of the properties to validate.
 * @returns Array
 * - Returns a new array containing only the objects where the specified properties are guaranteed to be defined.
 *
 * @example
 * interface RawCustomer {
 *   id: number;
 *   callAhead?: { id: string };
 *   email?: string;
 * }
 *
 * const customers: RawCustomer[] = [
 *   { id: 1, callAhead: { id: "123" }, email: "customer1@example.com" },
 *   { id: 2, callAhead: undefined, email: "customer2@example.com" },
 *   { id: 3, email: "customer3@example.com" },
 * ];
 *
 * const validCustomers = withDefinedKeys(customers, ["callAhead", "email"]);
 * console.log(validCustomers); // [{ id: 1, callAhead: { id: '123' }, email: 'customer1@example.com' }]
 *
 */
function withDefinedKeys<T, K extends keyof T>(
  items: T[],
  keys: K[],
): Array<T & { [P in K]-?: NonNullable<T[P]> }> {
  return items.filter((item): item is T): Array<T & { [P in K]-?: NonNullable<T[P]> }> {
  return items.filter((item): item is T & { [P in K]-?: NonNullable<T[P]> } =>
    keys.every((key) => item[key] !== undefined && item[key] !== null),
  );
}

function hasDefinedKeys<T>(
  item: T | undefined | null,
  keys: (keyof T)[],
): item is T {
  if (item == null) {
    // Handles both `null` and `undefined`
    return false;
  }
  return keys.some((key) => item[key] !== undefined && item[key] !== null);
}

function hasAnyDefinedKeys<T>(
  item: T | undefined | null,
  keys?: (keyof T)[],
): item is T {
  if (item == null) {
    // Handle `null` or `undefined`
    return false;
  }

  // Determine the keys to check (use all keys if none are explicitly provided)
  const keysToCheck = keys ?? (Object.keys(item) as (keyof T)[]);

  // Check if at least one key is defined (not `null` or `undefined`)
  const someKeysAreDefined = keysToCheck.some(
    (key) => item[key] !== undefined && item[key] !== null,
  );
  // console.log({ item, keysToCheck, someKeysAreDefined });
  return someKeysAreDefined;
}

function definedArray<T>(items: (T | undefined | null)[]): T[] {
  return items.filter((item): item is T => item !== undefined && item !== null);
}

export const typeGuard = {
  hasDefined,
  withDefinedKey,
  withDefinedKeys,
  hasDefinedKeys,
  hasAnyDefinedKeys,
  definedArray,
};
