// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function trimStringValues<T extends Record<string, any>>(obj: T): T {
  if (typeof obj !== "object" || obj === null) return obj; // Return if not object or null

  if (Array.isArray(obj)) {
    return obj.map(trimStringValues) as unknown as T; // Recurse into array and cast the result
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    acc[key as keyof T] =
      typeof value === "string" ? value.trim() : trimStringValues(value); // Recurse into object
    return acc;
  }, {} as T);
}
