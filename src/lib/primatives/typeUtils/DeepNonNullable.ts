// A utility to recursively strip nulls from a type.
// Functions and class instances (non-plain objects) are passed through unchanged
// so that methods remain callable and class instances are not destructured.
export type DeepNonNullable<T> = {
  [P in keyof T]: T[P] extends (...args: never[]) => unknown
    ? T[P]
    : T[P] extends (infer U)[]
      ? DeepNonNullable<U>[]
      : T[P] extends object
        ? DeepNonNullable<T[P]>
        : NonNullable<T[P]>;
};

/**
 * Generic Type Guard to check if an object and all its properties
 * (including nested ones and arrays) are non-null/non-undefined.
 */
export function isDeepNonNullable<T extends object>(
  obj: T,
): obj is T & DeepNonNullable<T> {
  // 1. Handle Null/Undefined
  if (obj === null || obj === undefined) return false;

  // 2. Handle Arrays
  if (Array.isArray(obj)) {
    return obj.every((item) => isDeepNonNullable(item));
  }

  // 3. Handle Objects
  if (typeof obj === "object") {
    return Object.values(obj).every((value) => isDeepNonNullable(value));
  }

  // 4. It's a primitive (number, string, etc.) and we already checked for null
  return true;
}
