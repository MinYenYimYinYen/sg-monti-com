import { createRpcHandler } from "@/lib/api/createRpcHandler";
import { HandlerMap } from "@/lib/api/types/rpcUtils";
import { AppError } from "@/lib/errors/AppError";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { can } from "@/permission/can";
import { loadVerifiedCaller } from "@/app/permission/_lib/capabilityLoaders";
import { TopicDetailContract } from "@/app/knowledgeBase/topicDetail/api/TopicDetailContract";
import { TopicDetailVersionModel } from "@/app/knowledgeBase/topicDetail/TopicDetailVersionModel";
import { TopicModel } from "@/app/knowledgeBase/topic/TopicModel";
import { MAX_COMMENT_CHARS } from "@/app/knowledgeBase/knowledgeBaseConst";
import { loadApproverUserNames } from "@/app/knowledgeBase/knowledgeBaseSettings/_lib/loadApproverUserNames";
import {
  buildDetailKey,
  findUnknownTopicKeys,
  normalizeTopicKeys,
} from "@/app/knowledgeBase/topicDetail/topicDetailLogic";
import { resolveApprovedAt } from "@/app/knowledgeBase/topicDetail/topicDetailApprovalLogic";
import {
  applyWithdrawal,
  buildNextVersion,
  checkBaseVersion,
  checkCanApprove,
  checkCanWithdraw,
  cleanCommentText,
  isDuplicateVersionError,
  isSameContent,
} from "@/app/knowledgeBase/topicDetail/topicDetailChangeLogic";
import {
  loadCurrentDocs,
  loadHeadDoc,
  loadLiveDocs,
  loadVersionDoc,
  loadVersionHistory,
} from "@/app/knowledgeBase/topicDetail/_lib/topicDetailQueries";
import { importLegacyDocs } from "@/app/knowledgeBase/topicDetail/_lib/legacyImport";

function validationError(message: string): AppError {
  return new AppError({ message, type: "VALIDATION_ERROR", statusCode: 400 });
}

const CHANGED_MEANWHILE = "This version changed while you were working. Refresh and try again.";

const handlers: HandlerMap<TopicDetailContract> = {
  getAll: {
    capability: can.knowledgeTopics.read,
    handler: async () => {
      await connectToMongoDB();
      return { success: true, payload: await loadLiveDocs() };
    },
  },

  getCurrent: {
    capability: can.knowledgeTopics.read,
    handler: async () => {
      await connectToMongoDB();
      return { success: true, payload: await loadCurrentDocs() };
    },
  },

  getVersionHistory: {
    capability: can.knowledgeTopics.read,
    handler: async ({ detailKey }) => {
      await connectToMongoDB();
      return { success: true, payload: await loadVersionHistory(detailKey) };
    },
  },

  saveVersion: {
    capability: can.knowledgeTopics.write,
    handler: async ({ topicKeys, title, contentHtml, baseVersion, comment }) => {
      const normalizedTopicKeys = normalizeTopicKeys(topicKeys);
      if (normalizedTopicKeys.length === 0) throw validationError("Choose at least one topic for this document.");
      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw validationError("A title is required.");
      if (cleanCommentText(comment).length > MAX_COMMENT_CHARS) {
        throw validationError(`A comment can be at most ${MAX_COMMENT_CHARS} characters.`);
      }

      const { userName } = await loadVerifiedCaller();
      await connectToMongoDB();

      const existingTopics = await TopicModel.find({ topicKey: { $in: normalizedTopicKeys } })
        .select("topicKey")
        .lean();
      const unknownTopicKeys = findUnknownTopicKeys({
        topicKeys: normalizedTopicKeys,
        knownTopicKeys: existingTopics.map((topic) => topic.topicKey),
      });
      if (unknownTopicKeys.length > 0) {
        throw validationError(`These topics do not exist: ${unknownTopicKeys.join(", ")}.`);
      }

      const detailKey = buildDetailKey(normalizedTopicKeys);
      const head = await loadHeadDoc(detailKey);
      const baseProblem = checkBaseVersion({ head, baseVersion });
      if (baseProblem) throw validationError(baseProblem);

      // Saving what is already there would only add a version identical to the last. A note typed with it
      // is not lost: it becomes a comment on the head.
      if (head && isSameContent({ head, title: trimmedTitle, contentHtml })) {
        const noteText = cleanCommentText(comment);
        if (noteText) {
          await TopicDetailVersionModel.updateOne(
            { detailKey, version: head.version },
            { $push: { comments: { userName, at: new Date().toISOString(), text: noteText } } },
          );
        }
        return { success: true, payload: await loadCurrentDocs(detailKey) };
      }

      const approverUserNames = await loadApproverUserNames();
      const row = buildNextVersion({
        detailKey,
        topicKeys: normalizedTopicKeys,
        title: trimmedTitle,
        contentHtml,
        modifiedBy: userName,
        comment,
        head,
        approverUserNames,
        now: new Date().toISOString(),
      });
      try {
        await TopicDetailVersionModel.create(row);
      } catch (e) {
        // The unique `detailKey, version` index: someone else saved the same version a moment earlier.
        if (isDuplicateVersionError(e)) throw validationError(CHANGED_MEANWHILE);
        throw e;
      }
      return { success: true, payload: await loadCurrentDocs(detailKey) };
    },
  },

  approve: {
    capability: can.knowledgeTopics.write,
    handler: async ({ detailKey, version }) => {
      const { userName } = await loadVerifiedCaller();
      await connectToMongoDB();

      const approverUserNames = await loadApproverUserNames();
      const head = await loadHeadDoc(detailKey);
      const problem = checkCanApprove({ userName, approverUserNames, version, head });
      if (problem) throw validationError(problem);

      const now = new Date().toISOString();
      // The filter repeats the rules that matter, so a double click, or a withdrawal in between, cannot slip through.
      const stamped = await TopicDetailVersionModel.findOneAndUpdate(
        {
          detailKey,
          version,
          "approval.approvedAt": null,
          "approval.approvedBy.userName": { $ne: userName },
        },
        { $push: { "approval.approvedBy": { userName, at: now } } },
        { new: true },
      ).lean();
      if (!stamped) throw validationError(CHANGED_MEANWHILE);

      const approvedAt = resolveApprovedAt({ approval: stamped.approval, approverUserNames, now });
      if (approvedAt !== null) {
        await TopicDetailVersionModel.updateOne(
          { detailKey, version, "approval.approvedAt": null },
          { $set: { "approval.approvedAt": approvedAt } },
        );
      }
      return { success: true, payload: await loadCurrentDocs(detailKey) };
    },
  },

  withdrawApproval: {
    capability: can.knowledgeTopics.write,
    handler: async ({ detailKey, version }) => {
      const { userName } = await loadVerifiedCaller();
      await connectToMongoDB();

      const approverUserNames = await loadApproverUserNames();
      const target = await loadVersionDoc({ detailKey, version });
      const problem = checkCanWithdraw({ userName, approverUserNames, target });
      if (problem || target === null) throw validationError(problem ?? "That version does not exist.");

      await TopicDetailVersionModel.updateOne(
        { detailKey, version },
        { $set: { approval: applyWithdrawal({ approval: target.approval, userName }) } },
      );
      return { success: true, payload: await loadCurrentDocs(detailKey) };
    },
  },

  comment: {
    capability: can.knowledgeTopics.write,
    handler: async ({ detailKey, version, text }) => {
      const commentText = cleanCommentText(text);
      if (!commentText) throw validationError("A comment cannot be empty.");
      if (commentText.length > MAX_COMMENT_CHARS) {
        throw validationError(`A comment can be at most ${MAX_COMMENT_CHARS} characters.`);
      }

      const { userName } = await loadVerifiedCaller();
      await connectToMongoDB();
      const result = await TopicDetailVersionModel.updateOne(
        { detailKey, version },
        { $push: { comments: { userName, at: new Date().toISOString(), text: commentText } } },
      );
      if (result.matchedCount === 0) throw validationError("That version does not exist.");
      return { success: true, payload: await loadCurrentDocs(detailKey) };
    },
  },

  remove: {
    capability: can.knowledgeTopics.delete,
    handler: async ({ detailKey }) => {
      await connectToMongoDB();
      await TopicDetailVersionModel.deleteMany({ detailKey });
      return { success: true, payload: true };
    },
  },

  // TEMPORARY: delete with migrateTheseThenDelete.json once the import has run.
  importLegacy: {
    capability: "superUser",
    handler: async () => {
      await connectToMongoDB();
      return { success: true, payload: await importLegacyDocs() };
    },
  },
};

export const POST = createRpcHandler(handlers);
