import { ImportCardAssignmentModel } from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import { KnowledgeBaseSettingModel } from "@/app/knowledgeBase/knowledgeBaseSettings/KnowledgeBaseSettingsModel";
import { loadApproverUserNames } from "@/app/knowledgeBase/knowledgeBaseSettings/_lib/loadApproverUserNames";
import { completePendingApprovals } from "@/app/knowledgeBase/topicDetail/_lib/completePendingApprovals";

/**
 * Removes the records that exist only to point at one user, so nothing is left referring to a
 * person who no longer exists. Server only; the caller has already connected to the database.
 *
 * A card assignment names the user responsible for a card. Left behind, the card would still
 * count as assigned (the import check only looks for an assignment, not for the user), so imports
 * would go through with a card nobody owns and a blank cardholder name. Removing it makes the
 * card unassigned again, and the next import asks for a new responsible user. Its account
 * override and typed cardholder name go with it.
 *
 * The knowledge base approver list names the users who may approve documents. A name nobody can act as
 * would block unanimous approval for good, so the deleted user is pulled from it.
 *
 * History that merely records who did something (import rows, journal postings, inventory
 * checks, the QBO connection) is deliberately kept, as is shared content (templates, configs),
 * which stores the author's saId. Add any other per-user data that only works with a login here.
 * The rule for which records belong here is in src/lib/mongoose/mongo.readme.md, section 4.
 */
export async function deleteUserReferences({ userName }: { userName: string }): Promise<void> {
  await ImportCardAssignmentModel.deleteMany({ userName });
  await KnowledgeBaseSettingModel.updateOne(
    { settingKey: "approvers" },
    { $pull: { "value.approverUserNames": userName } },
  );
  // The deleted user may have been the last approver a version was waiting for.
  await completePendingApprovals({ approverUserNames: await loadApproverUserNames() });
}
