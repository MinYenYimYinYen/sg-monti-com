import type { PrepayLetterData } from "@/app/prepayLetters/template/PrepayLetterTypes";
import type { RenewalBatchSummary } from "./renewalLettersLogic";

// Pure helpers for combining sibling batches. No React, no store.
//
// Only batches with the same parentKey (same renewal rule and billing rule, different upsell)
// can be combined, so a combined batch never mixes letter wording or addresses. The user's
// choices are stored as lists of batch keys; everything shown is derived from them, which is
// why a key that no longer exists after a reload just drops out.

/** One row in the table: a single batch, or several sibling batches joined. */
export type DisplayBatch = {
  /** The first member's batchKey. Identifies the row in selection state. */
  rowId: string;
  /** Batch keys in table order. */
  memberKeys: string[];
  parentKey: string;
  renewalKey: string;
  billingKey: string;
  billingLabel: string;
  upsellLabels: string[];
  /** Upsell rule keys (progCodeIds, or the no-upsell key) in table order. Empty for Group Bill. */
  upsellKeys: string[];
  customerCount: number;
  groupCount: number | null;
  isCombined: boolean;
  /** False for batches that never split by upsell (Group Bill). */
  canCombine: boolean;
  /** Members' letters joined in table order, each member keeping its own sort. */
  letters: PrepayLetterData[];
};

function toRow({ members }: { members: RenewalBatchSummary[] }): DisplayBatch {
  const [first] = members;
  const groupCounts = members.map((member) => member.groupCount);
  return {
    rowId: first.batchKey,
    memberKeys: members.map((member) => member.batchKey),
    parentKey: first.parentKey,
    renewalKey: first.renewalKey,
    billingKey: first.billingKey,
    billingLabel: first.billingLabel,
    upsellLabels: members.map((member) => member.upsellLabel).filter((label) => label !== ""),
    upsellKeys: members
      .map((member) => member.upsellKey)
      .filter((key): key is string => key !== null),
    customerCount: members.reduce((sum, member) => sum + member.customerCount, 0),
    groupCount: groupCounts.some((count) => count !== null)
      ? groupCounts.reduce<number>((sum, count) => sum + (count ?? 0), 0)
      : null,
    isCombined: members.length > 1,
    canCombine: first.upsellKey !== null,
    letters: members.flatMap((member) => member.letters),
  };
}

type BuildDisplayBatchesParams = {
  batches: RenewalBatchSummary[];
  combinedGroups: string[][];
};

/**
 * A combined row sits where its first member sits. A group with fewer than two surviving
 * members, or with members of different parents, is ignored, so stale groups are harmless.
 */
export function buildDisplayBatches({
  batches,
  combinedGroups,
}: BuildDisplayBatchesParams): DisplayBatch[] {
  const batchByKey = new Map(batches.map((batch) => [batch.batchKey, batch]));
  const groupMembersByKey = new Map<string, RenewalBatchSummary[]>();

  for (const group of combinedGroups) {
    const live = group
      .map((key) => batchByKey.get(key))
      .filter((batch): batch is RenewalBatchSummary => batch !== undefined);
    if (live.length < 2) continue;
    if (live.some((batch) => batch.parentKey !== live[0].parentKey || batch.upsellKey === null)) {
      continue;
    }
    if (live.some((batch) => groupMembersByKey.has(batch.batchKey))) continue;

    const liveKeys = new Set(live.map((batch) => batch.batchKey));
    const members = batches.filter((batch) => liveKeys.has(batch.batchKey));
    for (const member of members) groupMembersByKey.set(member.batchKey, members);
  }

  const rows: DisplayBatch[] = [];
  const emitted = new Set<string>();
  for (const batch of batches) {
    const members = groupMembersByKey.get(batch.batchKey);
    if (!members) {
      rows.push(toRow({ members: [batch] }));
      continue;
    }
    if (emitted.has(members[0].batchKey)) continue;
    emitted.add(members[0].batchKey);
    rows.push(toRow({ members }));
  }
  return rows;
}

/**
 * Once a row is checked, only its siblings stay available. Checked rows stay enabled so they
 * can be unchecked.
 */
export function getDisabledRowIds({
  rows,
  checkedRowIds,
}: {
  rows: DisplayBatch[];
  checkedRowIds: string[];
}): Set<string> {
  const checked = new Set(checkedRowIds);
  const firstChecked = rows.find((row) => checked.has(row.rowId));
  if (!firstChecked) return new Set();
  return new Set(
    rows
      .filter(
        (row) =>
          !checked.has(row.rowId) && (row.parentKey !== firstChecked.parentKey || !row.canCombine),
      )
      .map((row) => row.rowId),
  );
}

export function canCombineRows(rows: DisplayBatch[]): boolean {
  return (
    rows.length >= 2 &&
    rows.every((row) => row.canCombine && row.parentKey === rows[0].parentKey)
  );
}

/** Every member key of the checked rows, in table order, flattening rows that were already combined. */
export function getCombineMemberKeys({
  checkedRows,
  batches,
}: {
  checkedRows: DisplayBatch[];
  batches: RenewalBatchSummary[];
}): string[] {
  const wanted = new Set(checkedRows.flatMap((row) => row.memberKeys));
  return batches.filter((batch) => wanted.has(batch.batchKey)).map((batch) => batch.batchKey);
}

export type BillingSection = {
  billingKey: string;
  billingLabel: string;
  rows: DisplayBatch[];
  customerCount: number;
  groupCount: number | null;
};

/** Sections in the order the rows arrive, which is billing rule order. */
export function groupRowsByBilling(rows: DisplayBatch[]): BillingSection[] {
  const sections: BillingSection[] = [];
  for (const row of rows) {
    let section = sections.find((candidate) => candidate.billingKey === row.billingKey);
    if (!section) {
      section = {
        billingKey: row.billingKey,
        billingLabel: row.billingLabel,
        rows: [],
        customerCount: 0,
        groupCount: null,
      };
      sections.push(section);
    }
    section.rows.push(row);
    section.customerCount += row.customerCount;
    if (row.groupCount !== null) section.groupCount = (section.groupCount ?? 0) + row.groupCount;
  }
  return sections;
}
