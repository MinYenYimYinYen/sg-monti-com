import { HandlerMap } from "@/lib/api/types/rpcUtils";
import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoArray, cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { createQboRpcHandler } from "@/app/qbo/_lib/api/createQboRpcHandler";
import { ImportCCTxnMappingContract } from "@/app/qbo/importCCTxn/api/ImportCCTxnMappingContract";
import {
  ImportCardAssignmentModel,
  ImportFormatAccountModel,
  ImportMerchantMappingModel,
  ImportSkipRuleModel,
} from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import UserModel from "@/app/auth/_models/UserModel";
import {
  AssignableUser,
  CardAssignment,
  FormatAccount,
  MerchantMapping,
  SkipRule,
} from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import {
  validateCardAssignment,
  validateFormatAccount,
  validateMerchantMapping,
  validateSkipRule,
} from "@/app/qbo/importCCTxn/_lib/importMappingUtils";

function failIfInvalid(problems: string[]): void {
  if (problems.length > 0) {
    throw new AppError({
      message: problems.join(" "),
      type: "VALIDATION_ERROR",
      statusCode: 400,
    });
  }
}

const handlers: HandlerMap<ImportCCTxnMappingContract> = {
  getFormatAccounts: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await ImportFormatAccountModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) as FormatAccount[] };
    },
  },
  upsertFormatAccount: {
    roles: ["admin"],
    handler: async ({ formatAccount }) => {
      failIfInvalid(validateFormatAccount(formatAccount));
      await connectToMongoDB();
      const saved = await ImportFormatAccountModel.findOneAndUpdate(
        { formatId: formatAccount.formatId },
        {
          $set: {
            accountIds: formatAccount.accountIds,
            defaultAccountId: formatAccount.defaultAccountId,
          },
        },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(saved!) as FormatAccount };
    },
  },

  getAssignableUsers: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();
      // Staff only, and only the name fields: email, saId and role never reach the browser.
      const docs = await UserModel.find({ role: { $in: ["admin", "office", "tech"] } })
        .select("userName firstName lastName")
        .sort({ lastName: 1, firstName: 1 })
        .lean();
      const payload: AssignableUser[] = docs.map((doc) => ({
        userName: doc.userName,
        firstName: doc.firstName,
        lastName: doc.lastName,
      }));
      return { success: true, payload };
    },
  },

  getCardAssignments: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await ImportCardAssignmentModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) as CardAssignment[] };
    },
  },
  upsertCardAssignment: {
    roles: ["office", "admin"],
    handler: async ({ cardAssignment }) => {
      await connectToMongoDB();
      const formatAccountDoc = await ImportFormatAccountModel.findOne({
        formatId: cardAssignment.formatId,
      }).lean();
      failIfInvalid(
        validateCardAssignment({
          cardAssignment,
          formatAccount: formatAccountDoc
            ? (cleanMongoObject(formatAccountDoc) as FormatAccount)
            : null,
        }),
      );

      // Clearing an optional field must remove it, so unset instead of storing undefined.
      const unset: Record<string, 1> = {};
      if (!cardAssignment.cardholderName) unset.cardholderName = 1;
      if (!cardAssignment.accountId) unset.accountId = 1;

      const saved = await ImportCardAssignmentModel.findOneAndUpdate(
        { formatId: cardAssignment.formatId, last4: cardAssignment.last4 },
        {
          $set: {
            userName: cardAssignment.userName,
            ...(cardAssignment.cardholderName
              ? { cardholderName: cardAssignment.cardholderName }
              : {}),
            ...(cardAssignment.accountId ? { accountId: cardAssignment.accountId } : {}),
          },
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(saved!) as CardAssignment };
    },
  },

  getMerchantMappings: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await ImportMerchantMappingModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) as MerchantMapping[] };
    },
  },
  upsertMerchantMapping: {
    roles: ["office", "admin"],
    handler: async ({ merchantMapping }) => {
      failIfInvalid(validateMerchantMapping(merchantMapping));
      await connectToMongoDB();
      const saved = await ImportMerchantMappingModel.findOneAndUpdate(
        { merchantKey: merchantMapping.merchantKey, ownerUserName: merchantMapping.ownerUserName },
        {
          $set: {
            vendorId: merchantMapping.vendorId,
            defaultAccountId: merchantMapping.defaultAccountId,
            otherAccountIds: merchantMapping.otherAccountIds,
          },
        },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(saved!) as MerchantMapping };
    },
  },
  deleteMerchantMapping: {
    roles: ["office", "admin"],
    handler: async ({ merchantKey, ownerUserName }) => {
      await connectToMongoDB();
      await ImportMerchantMappingModel.deleteOne({ merchantKey, ownerUserName });
      return { success: true, payload: { merchantKey, ownerUserName } };
    },
  },

  getSkipRules: {
    roles: ["office", "admin"],
    handler: async () => {
      await connectToMongoDB();
      const docs = await ImportSkipRuleModel.find({}).lean();
      return { success: true, payload: cleanMongoArray(docs) as SkipRule[] };
    },
  },
  upsertSkipRule: {
    roles: ["office", "admin"],
    handler: async ({ skipRule }) => {
      failIfInvalid(validateSkipRule(skipRule));
      await connectToMongoDB();
      const saved = await ImportSkipRuleModel.findOneAndUpdate(
        { merchantKey: skipRule.merchantKey },
        { $set: { reason: skipRule.reason } },
        { upsert: true, new: true },
      ).lean();
      return { success: true, payload: cleanMongoObject(saved!) as SkipRule };
    },
  },
  deleteSkipRule: {
    roles: ["office", "admin"],
    handler: async ({ merchantKey }) => {
      await connectToMongoDB();
      await ImportSkipRuleModel.deleteOne({ merchantKey });
      return { success: true, payload: { merchantKey } };
    },
  },
};

export const POST = createQboRpcHandler(handlers);
