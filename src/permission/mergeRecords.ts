// Pure helper for combining two or more keyed objects into one. Each source object says how its
// keys are renamed on the way in, so objects that reuse a key (two features that both have a
// `customers` resource) can be merged without one silently overwriting the other. A duplicate
// after renaming is a mistake in the declarations, so it throws instead of picking a winner.

export type RecordPart<T> = {
  record: Readonly<Record<string, T>>;
  rekey: (key: string) => string;
};

export function mergeRecords<T>({
  parts,
  what,
}: {
  parts: readonly RecordPart<T>[];
  /** Names the kind of thing being merged, for the duplicate error ("resource", "requirement"). */
  what: string;
}): Record<string, T> {
  const merged = new Map<string, T>();

  for (const { record, rekey } of parts) {
    for (const [key, value] of Object.entries(record)) {
      const mergedKey = rekey(key);
      if (merged.has(mergedKey)) {
        throw new Error(`Duplicate ${what} '${mergedKey}' while merging`);
      }
      merged.set(mergedKey, value);
    }
  }

  return Object.fromEntries(merged);
}
