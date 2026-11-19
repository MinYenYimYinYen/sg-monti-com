import { readFile } from "node:fs/promises";
import path from "node:path";
import { TopicModel } from "@/app/knowledgeBase/topic/TopicModel";
import { TopicDetailVersionModel } from "@/app/knowledgeBase/topicDetail/TopicDetailVersionModel";
import type { LegacyImportResult } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { buildDetailKey, findUnknownTopicKeys, normalizeTopicKeys } from "@/app/knowledgeBase/topicDetail/topicDetailLogic";

// TEMPORARY. Delete this file, the `importLegacy` op, and migrateTheseThenDelete.json after the import has run.

const LEGACY_FILE = path.join(process.cwd(), "src", "app", "knowledgeBase", "topicDetail", "migrateTheseThenDelete.json");

type LegacyRow = {
  detailKey: string;
  topicKeys: string[];
  title: string;
  contentHtml: string;
  createdAt: string;
  updatedAt: string;
};

type LegacyParse = { rows: LegacyRow[]; skipped: LegacyImportResult["skipped"] };

/** A Compass export writes dates as `{ "$date": "..." }`. A plain string is accepted too. */
function readDate(value: unknown): string | null {
  const raw = typeof value === "object" && value !== null && "$date" in value ? value.$date : value;
  if (typeof raw !== "string") return null;
  return Number.isNaN(Date.parse(raw)) ? null : new Date(raw).toISOString();
}

/** Turns the exported JSON into rows, and names every entry it cannot use instead of dropping it silently. */
export function parseLegacyDocs(json: unknown): LegacyParse {
  const parse: LegacyParse = { rows: [], skipped: [] };
  if (!Array.isArray(json)) return { rows: [], skipped: [{ detailKey: "(file)", reason: "The file is not a JSON array." }] };

  for (const entry of json as Record<string, unknown>[]) {
    const label = typeof entry?.detailKey === "string" ? entry.detailKey : "(no detailKey)";
    const topicKeys = Array.isArray(entry?.topicKeys) ? normalizeTopicKeys(entry.topicKeys.map(String)) : [];
    const createdAt = readDate(entry?.createdAt);
    const updatedAt = readDate(entry?.updatedAt);
    if (topicKeys.length === 0) parse.skipped.push({ detailKey: label, reason: "No topic keys." });
    else if (typeof entry.title !== "string" || entry.title.trim() === "") parse.skipped.push({ detailKey: label, reason: "No title." });
    else if (!createdAt || !updatedAt) parse.skipped.push({ detailKey: label, reason: "Missing or invalid dates." });
    else {
      parse.rows.push({
        detailKey: buildDetailKey(topicKeys),
        topicKeys,
        title: entry.title.trim(),
        contentHtml: typeof entry.contentHtml === "string" ? entry.contentHtml : "",
        createdAt,
        updatedAt,
      });
    }
  }
  return parse;
}

/**
 * Inserts each exported document as version 1, approved as of its last edit, so the AI keeps working
 * from day one. Safe to run again: a document that already has a version 1 is skipped. Server only;
 * the caller has already connected to the database.
 */
export async function importLegacyDocs(): Promise<LegacyImportResult> {
  const { rows, skipped } = parseLegacyDocs(JSON.parse(await readFile(LEGACY_FILE, "utf8")));

  const knownTopics = await TopicModel.find().select("topicKey").lean();
  const knownTopicKeys = knownTopics.map((topic) => topic.topicKey);
  const importedDetailKeys: string[] = [];

  for (const row of rows) {
    const unknownTopicKeys = findUnknownTopicKeys({ topicKeys: row.topicKeys, knownTopicKeys });
    if (unknownTopicKeys.length > 0) {
      skipped.push({ detailKey: row.detailKey, reason: `Unknown topics: ${unknownTopicKeys.join(", ")}.` });
      continue;
    }
    // The filter supplies `detailKey` and `version`, so the update does not set them again.
    const { createdAt, updatedAt, detailKey, ...content } = row;
    // `timestamps: false` keeps the original dates instead of stamping the import time.
    const result = await TopicDetailVersionModel.updateOne(
      { detailKey, version: 1 },
      {
        $setOnInsert: {
          ...content,
          modifiedBy: "migration",
          approval: { approvedAt: updatedAt, approvedBy: [] },
          comments: [],
          createdAt: new Date(createdAt),
          updatedAt: new Date(updatedAt),
        },
      },
      { upsert: true, timestamps: false },
    );
    if (result.upsertedCount > 0) importedDetailKeys.push(row.detailKey);
    else skipped.push({ detailKey: row.detailKey, reason: "Version 1 already exists." });
  }
  return { importedDetailKeys, skipped };
}
