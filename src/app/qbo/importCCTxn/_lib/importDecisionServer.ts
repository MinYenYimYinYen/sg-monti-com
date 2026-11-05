import connectToMongoDB from "@/lib/mongoose/connectToMongoDB";
import { cleanMongoObject } from "@/lib/mongoose/cleanMongoObj";
import { AppError } from "@/lib/errors/AppError";
import { ImportSkipRuleModel } from "@/app/qbo/importCCTxn/models/ImportCCTxnMappingModels";
import { MerchantMapping, SkipRule } from "@/app/qbo/importCCTxn/types/ImportCCTxnMappingTypes";
import { ImportRow } from "@/app/qbo/importCCTxn/types/ImportRowTypes";
import {
  DecisionFailure,
  MappingDecision,
  SaveDecisionsParams,
  SaveDecisionsResult,
} from "@/app/qbo/importCCTxn/types/ImportDecisionTypes";
import {
  validateMerchantMapping,
  validateSkipRule,
} from "@/app/qbo/importCCTxn/_lib/importMappingUtils";
import { storeMerchantMapping } from "@/app/qbo/importCCTxn/_lib/importMappingSaveServer";
import {
  setImportRowAccount,
  setImportRowSkip,
  skipPendingRowsForMerchant,
} from "@/app/qbo/importCCTxn/_lib/importRowAccessServer";
import { DEFAULT_MANUAL_SKIP_REASON } from "@/app/qbo/importCCTxn/_lib/importSkipUtils";

// Applies everything decided on the Map tab in one request. It writes only our own collections,
// never QuickBooks. Each part is applied on its own: a part that is refused is reported in
// `failures` and does not stop the others, so the browser can keep it in the draft.

function messageOf(error: unknown): string {
  // Operational errors are written for the user. Anything else is a bug, so it stays generic.
  return error instanceof AppError && error.isOperational
    ? error.message
    : "That could not be saved. Try again.";
}

async function saveMappingDecisions(
  mappingDecisions: MappingDecision[],
): Promise<{ merchantMappings: MerchantMapping[]; failures: DecisionFailure[] }> {
  const merchantMappings: MerchantMapping[] = [];
  const failures: DecisionFailure[] = [];

  for (const decision of mappingDecisions) {
    const problems = validateMerchantMapping({
      merchantKey: decision.merchantKey,
      ownerUserName: null,
      vendorId: decision.vendorId,
      defaultAccountId: decision.defaultAccountId,
      otherAccountIds: [],
      confirmedMerchants: decision.confirmedDescriptions,
    });
    if (problems.length > 0) {
      failures.push({ merchantKey: decision.merchantKey, rowId: null, message: problems.join(" ") });
      continue;
    }
    try {
      merchantMappings.push(
        await storeMerchantMapping({
          merchantKey: decision.merchantKey,
          ownerUserName: null,
          vendorId: decision.vendorId,
          defaultAccountId: decision.defaultAccountId,
          otherAccountIds: null,
          confirmedMerchants: decision.confirmedDescriptions,
        }),
      );
    } catch (error) {
      failures.push({ merchantKey: decision.merchantKey, rowId: null, message: messageOf(error) });
    }
  }
  return { merchantMappings, failures };
}

async function saveRowChanges({
  rowAccountDecisions,
  skippedRowIds,
}: Pick<SaveDecisionsParams, "rowAccountDecisions" | "skippedRowIds">): Promise<{
  rows: ImportRow[];
  failures: DecisionFailure[];
}> {
  const rows: ImportRow[] = [];
  const failures: DecisionFailure[] = [];

  for (const { rowId, accountId } of rowAccountDecisions) {
    try {
      rows.push(await setImportRowAccount({ rowId, accountId }));
    } catch (error) {
      failures.push({ merchantKey: null, rowId, message: messageOf(error) });
    }
  }
  for (const rowId of skippedRowIds) {
    try {
      rows.push(await setImportRowSkip({ rowId, skipReason: DEFAULT_MANUAL_SKIP_REASON }));
    } catch (error) {
      failures.push({ merchantKey: null, rowId, message: messageOf(error) });
    }
  }
  return { rows, failures };
}

async function saveSkipRules(
  skipRuleMerchantKeys: string[],
): Promise<{ skipRules: SkipRule[]; failures: DecisionFailure[] }> {
  const skipRules: SkipRule[] = [];
  const failures: DecisionFailure[] = [];

  for (const merchantKey of skipRuleMerchantKeys) {
    const skipRule: SkipRule = { merchantKey, reason: DEFAULT_MANUAL_SKIP_REASON };
    const problems = validateSkipRule(skipRule);
    if (problems.length > 0) {
      failures.push({ merchantKey, rowId: null, message: problems.join(" ") });
      continue;
    }
    try {
      const saved = await ImportSkipRuleModel.findOneAndUpdate(
        { merchantKey },
        { $set: { reason: skipRule.reason } },
        { upsert: true, new: true },
      ).lean();
      // The rule also covers rows imported before it existed.
      await skipPendingRowsForMerchant({ merchantKey, skipReason: skipRule.reason });
      skipRules.push(cleanMongoObject(saved!) as SkipRule);
    } catch (error) {
      failures.push({ merchantKey, rowId: null, message: messageOf(error) });
    }
  }
  return { skipRules, failures };
}

export async function saveDecisions(params: SaveDecisionsParams): Promise<SaveDecisionsResult> {
  await connectToMongoDB();

  const mappingResult = await saveMappingDecisions(params.mappingDecisions);
  const rowResult = await saveRowChanges(params);
  const skipRuleResult = await saveSkipRules(params.skipRuleMerchantKeys);

  return {
    merchantMappings: mappingResult.merchantMappings,
    skipRules: skipRuleResult.skipRules,
    rows: rowResult.rows,
    failures: [...mappingResult.failures, ...rowResult.failures, ...skipRuleResult.failures],
  };
}
