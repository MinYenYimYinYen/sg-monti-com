import { DuplicateCheckedRow, RowIdentity } from "@/app/qbo/importCCTxn/types/ImportCCTxnTypes";

function softKey(row: RowIdentity): string {
  return `${row.last4}|${row.amountCents}|${row.transactionDate}`;
}

/**
 * Identical rows within one file are real separate purchases, so duplicates are decided by
 * multiplicity: if the file holds M rows with a hash and the database holds N, the first N are
 * duplicates and the remaining M-N are new. A new row that matches an existing row's card,
 * amount and date (but not its hash) is flagged as a possible duplicate for the user to
 * confirm; it never blocks.
 */
export function checkDuplicates({
  rows,
  existingRows,
}: {
  rows: RowIdentity[];
  existingRows: RowIdentity[];
}): DuplicateCheckedRow[] {
  const existingCountByHash = new Map<string, number>();
  const existingBySoftKey = new Map<string, RowIdentity[]>();
  for (const existing of existingRows) {
    existingCountByHash.set(existing.rowHash, (existingCountByHash.get(existing.rowHash) ?? 0) + 1);
    const key = softKey(existing);
    const sameKey = existingBySoftKey.get(key);
    if (sameKey) sameKey.push(existing);
    else existingBySoftKey.set(key, [existing]);
  }

  const seenInFileByHash = new Map<string, number>();
  return rows.map((row) => {
    const occurrence = (seenInFileByHash.get(row.rowHash) ?? 0) + 1;
    seenInFileByHash.set(row.rowHash, occurrence);

    const isDuplicate = occurrence <= (existingCountByHash.get(row.rowHash) ?? 0);
    const lookalike = isDuplicate
      ? undefined
      : existingBySoftKey.get(softKey(row))?.find((existing) => existing.rowHash !== row.rowHash);

    return {
      rowHash: row.rowHash,
      occurrence,
      isDuplicate,
      possibleDuplicateOfHash: lookalike ? lookalike.rowHash : null,
    };
  });
}
