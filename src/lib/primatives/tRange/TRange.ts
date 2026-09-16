export type TRange<T> = {
  min: T;
  max: T;
};

export type NullableTRange<T> = {
  min: T | null;
  max: T | null;
}

export function isTRangeOfString(obj: unknown): obj is TRange<string> {
  return (
    typeof obj === "object" &&
    obj !== null &&
    "min" in obj &&
    "max" in obj &&
    typeof obj.min === "string" &&
    typeof obj.max === "string"
  );
}
