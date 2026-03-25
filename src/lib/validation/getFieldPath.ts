type PathBuilder<T> = {
  toString(): string;
  index(idx: number): PathBuilder<T extends (infer U)[] ? U : never>;
  field<K extends keyof T>(key: K): PathBuilder<T[K]>;
};

function createPathBuilder<T>(path: string = ""): PathBuilder<T> {
  return {
    toString() {
      return path;
    },
    index(idx: number) {
      return createPathBuilder(`${path}[${idx}]`);
    },
    field(key) {
      const separator = path ? "." : "";
      return createPathBuilder(`${path}${separator}${String(key)}`);
    },
  };
}

export function getFieldPath<T>(): PathBuilder<T> {
  return createPathBuilder<T>();
}
