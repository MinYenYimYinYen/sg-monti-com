export function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

export function chunkObjectArray<T, K extends keyof T>(
  array: T[],
  arrayKey: K,
  chunkSize: number,
): T[] {
  const result: T[] = [];

  array.forEach((obj) => {
    const arrayToChunk = obj[arrayKey];

    if (!Array.isArray(arrayToChunk)) {
      result.push(obj);
      return;
    }

    const chunks = chunkArray(arrayToChunk, chunkSize);

    chunks.forEach((chunk) => {
      result.push({
        ...obj,
        [arrayKey]: chunk,
      } as T);
    });
  });

  return result;
}
