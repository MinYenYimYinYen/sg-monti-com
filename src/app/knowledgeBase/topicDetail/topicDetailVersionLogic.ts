import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";

// Which row of a document is the head and which is live. Pure functions of plain rows, so the server,
// the selectors and any test run the same code.
//
//   head  the highest version. What editors and reviewers work on.
//   live  the highest version that is approved. The only one the AI reads. It is a different row from
//         the head whenever the head is still waiting for approval.

type Identified = Pick<TopicDetailDoc, "detailKey" | "version">;
type Approvable = Identified & Pick<TopicDetailDoc, "approval">;

export function isApproved(doc: Pick<TopicDetailDoc, "approval">): boolean {
  return doc.approval.approvedAt !== null;
}

export function findHeadDoc<T extends Pick<TopicDetailDoc, "version">>(docs: T[]): T | null {
  let head: T | null = null;
  for (const doc of docs) if (head === null || doc.version > head.version) head = doc;
  return head;
}

export function findLiveDoc<T extends Pick<TopicDetailDoc, "version" | "approval">>(docs: T[]): T | null {
  return findHeadDoc(docs.filter(isApproved));
}

function groupByDetailKey<T extends Pick<TopicDetailDoc, "detailKey">>(docs: T[]): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const doc of docs) {
    const group = groups.get(doc.detailKey) ?? [];
    group.push(doc);
    groups.set(doc.detailKey, group);
  }
  return groups;
}

/** One row per document: its highest version. */
export function pickHeadDocs<T extends Identified>(docs: T[]): T[] {
  const heads: T[] = [];
  for (const group of groupByDetailKey(docs).values()) {
    const head = findHeadDoc(group);
    if (head) heads.push(head);
  }
  return heads;
}

/** One row per document that has ever been approved: its highest approved version. */
export function pickLiveDocs<T extends Approvable>(docs: T[]): T[] {
  const lives: T[] = [];
  for (const group of groupByDetailKey(docs).values()) {
    const live = findLiveDoc(group);
    if (live) lives.push(live);
  }
  return lives;
}

/** Every head, plus the live row of a document where it is a different version from its head. */
export function mergeHeadAndLive<T extends Identified>({ heads, lives }: { heads: T[]; lives: T[] }): T[] {
  const headIds = new Set(heads.map((head) => `${head.detailKey}|${head.version}`));
  return [...heads, ...lives.filter((live) => !headIds.has(`${live.detailKey}|${live.version}`))];
}

/** Swaps every row of one document for the rows the server just sent for it. */
export function replaceRowsForKey<T extends Pick<TopicDetailDoc, "detailKey">>({
  rows,
  detailKey,
  incoming,
}: {
  rows: T[];
  detailKey: string;
  incoming: T[];
}): T[] {
  return [...rows.filter((row) => row.detailKey !== detailKey), ...incoming];
}

export function sortNewestFirst<T extends Pick<TopicDetailDoc, "version">>(docs: T[]): T[] {
  return [...docs].sort((a, b) => b.version - a.version);
}

/** For example "Nov 18, 2026, 2:05 PM". */
export function formatVersionTime(at: string): string {
  return new Date(at).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
