import type { PipelineStage } from "mongoose";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { TopicDetailVersionModel } from "@/app/knowledgeBase/topicDetail/TopicDetailVersionModel";
import type { TopicDetailDoc } from "@/app/knowledgeBase/topicDetail/TopicDetailTypes";
import { mergeHeadAndLive } from "@/app/knowledgeBase/topicDetail/topicDetailVersionLogic";

// Server only. The callers have already connected to the database.

/** The highest version of each document, found through the `detailKey, version` index. */
const NEWEST_PER_KEY: PipelineStage[] = [
  { $sort: { detailKey: 1, version: -1 } },
  { $group: { _id: "$detailKey", doc: { $first: "$$ROOT" } } },
  { $replaceRoot: { newRoot: "$doc" } },
];

const APPROVED_ONLY: PipelineStage = { $match: { "approval.approvedAt": { $ne: null } } };

function onlyKey(detailKey: string | undefined): PipelineStage[] {
  return detailKey === undefined ? [] : [{ $match: { detailKey } }];
}

/** The head of every document, or of one document when `detailKey` is given. */
export async function loadHeadDocs(detailKey?: string): Promise<TopicDetailDoc[]> {
  const rows = await TopicDetailVersionModel.aggregate<TopicDetailDoc>([...onlyKey(detailKey), ...NEWEST_PER_KEY]);
  return cleanMongoArray(rows);
}

/** The live (highest approved) version of every document that has one. */
export async function loadLiveDocs(detailKey?: string): Promise<TopicDetailDoc[]> {
  const rows = await TopicDetailVersionModel.aggregate<TopicDetailDoc>([
    ...onlyKey(detailKey),
    APPROVED_ONLY,
    ...NEWEST_PER_KEY,
  ]);
  return cleanMongoArray(rows);
}

/** Every head, plus the live row of a document where it is a different version. What the web app holds. */
export async function loadCurrentDocs(detailKey?: string): Promise<TopicDetailDoc[]> {
  const [heads, lives] = await Promise.all([loadHeadDocs(detailKey), loadLiveDocs(detailKey)]);
  return mergeHeadAndLive({ heads, lives });
}

export async function loadHeadDoc(detailKey: string): Promise<TopicDetailDoc | null> {
  const doc = await TopicDetailVersionModel.findOne({ detailKey }).sort({ version: -1 }).lean();
  return doc ? cleanMongoObject(doc) : null;
}

export async function loadVersionDoc({
  detailKey,
  version,
}: {
  detailKey: string;
  version: number;
}): Promise<TopicDetailDoc | null> {
  const doc = await TopicDetailVersionModel.findOne({ detailKey, version }).lean();
  return doc ? cleanMongoObject(doc) : null;
}

/** Every version of one document, newest first. */
export async function loadVersionHistory(detailKey: string): Promise<TopicDetailDoc[]> {
  const docs = await TopicDetailVersionModel.find({ detailKey }).sort({ version: -1 }).lean();
  return cleanMongoArray(docs);
}

/** The documents tagged with a topic, once each however many versions they have. */
export async function loadDocumentsReferencingTopic(
  topicKey: string,
): Promise<{ detailKey: string; title: string }[]> {
  const rows = await TopicDetailVersionModel.aggregate<{ _id: string; title: string }>([
    { $match: { topicKeys: topicKey } },
    { $sort: { detailKey: 1, version: -1 } },
    { $group: { _id: "$detailKey", title: { $first: "$title" } } },
    { $sort: { _id: 1 } },
  ]);
  return rows.map((row) => ({ detailKey: row._id, title: row.title }));
}
