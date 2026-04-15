import { Draft, PayloadAction } from "@reduxjs/toolkit";
import { ServCodeDoc } from "@/app/realGreen/progServ/_lib/types/ServCodeTypes";
import { ProgCodeDoc } from "@/app/realGreen/progServ/_lib/types/ProgCodeTypes";
import {
  ProgServState,
  UnsavedProgCodeChanges,
  UnsavedServCodeChanges,
} from "@/app/realGreen/progServ/_lib/types/ProgServState";
import {
  baseProductRule,
  ProductRuleDoc,
} from "@/app/realGreen/progServ/_lib/types/ProductRule";

// ─── ServCode actions ────────────────────────────────────────────────────────

const executeUpdateServCode = (
  servCodeDocs: ServCodeDoc[],
  unsavedServCodeChanges: UnsavedServCodeChanges[],
  servCodeId: string,
  changes: Partial<ServCodeDoc>,
) => {
  const index = servCodeDocs.findIndex(
    (servCode) => servCode.servCodeId === servCodeId,
  );

  if (index !== -1) {
    let unsavedChanges = unsavedServCodeChanges.find(
      (change) => change.updated.servCodeId === servCodeId,
    );

    if (!unsavedChanges) {
      unsavedChanges = {
        original: { ...servCodeDocs[index] },
        updated: { ...servCodeDocs[index] },
      };
      unsavedServCodeChanges.push(unsavedChanges);
    }

    unsavedChanges.updated = {
      ...unsavedChanges.updated,
      ...changes,
    };

    servCodeDocs[index] = unsavedChanges.updated;
  }
};

const handleUpdateServCode = (
  state: Draft<ProgServState>,
  action: PayloadAction<Partial<ServCodeDoc>>,
) => {
  const { servCodeId, ...changes } = action.payload;
  if (!servCodeId) return;
  executeUpdateServCode(
    state.servCodeDocs,
    state.unsavedServCodeChanges,
    servCodeId,
    changes,
  );
};

const handleRevertServCode = (
  state: Draft<ProgServState>,
  action: PayloadAction<{ servCodeId: string }>,
) => {
  const { servCodeId } = action.payload;
  const changeIndex = state.unsavedServCodeChanges.findIndex(
    (c) => c.updated.servCodeId === servCodeId,
  );

  if (changeIndex !== -1) {
    const change = state.unsavedServCodeChanges[changeIndex];

    const docIndex = state.servCodeDocs.findIndex(
      (d) => d.servCodeId === servCodeId,
    );

    if (docIndex !== -1) {
      state.servCodeDocs[docIndex] = change.original;
    }

    state.unsavedServCodeChanges.splice(changeIndex, 1);
  }
};

const handleAddProductRule = (
  state: Draft<ProgServState>,
  action: PayloadAction<{ servCodeId: string }>,
) => {
  const servCodeDoc = state.servCodeDocs.find(
    (sc) => sc.servCodeId === action.payload.servCodeId,
  );
  if (!servCodeDoc) return;

  const newProductRuleDocs = [
    ...servCodeDoc.productRuleDocs,
    { ...baseProductRule },
  ];

  executeUpdateServCode(
    state.servCodeDocs,
    state.unsavedServCodeChanges,
    action.payload.servCodeId,
    { productRuleDocs: newProductRuleDocs },
  );
};

export const getRuleId = (rule: ProductRuleDoc) =>
  `${rule.size}${rule.sizeOperator}`;

const executeUpdateProductRule = (
  servCodeDocs: ServCodeDoc[],
  unsavedServCodeChanges: UnsavedServCodeChanges[],
  servCodeId: string,
  ruleId: string,
  changeFn: (rule: ProductRuleDoc) => ProductRuleDoc | null,
) => {
  const servCodeDoc = servCodeDocs.find((sc) => sc.servCodeId === servCodeId);
  if (!servCodeDoc) return;

  const ruleIndex = servCodeDoc.productRuleDocs.findIndex(
    (r) => getRuleId(r) === ruleId,
  );

  if (ruleIndex === -1) return;

  const newProductRuleDocs = [...servCodeDoc.productRuleDocs];
  const updatedRule = changeFn(newProductRuleDocs[ruleIndex]);

  if (updatedRule === null) {
    newProductRuleDocs.splice(ruleIndex, 1);
  } else {
    newProductRuleDocs[ruleIndex] = updatedRule;
  }

  executeUpdateServCode(servCodeDocs, unsavedServCodeChanges, servCodeId, {
    productRuleDocs: newProductRuleDocs,
  });
};

const handleRemoveProductRule = (
  state: Draft<ProgServState>,
  action: PayloadAction<{ servCodeId: string; ruleId: string }>,
) => {
  const { servCodeId, ruleId } = action.payload;
  executeUpdateProductRule(
    state.servCodeDocs,
    state.unsavedServCodeChanges,
    servCodeId,
    ruleId,
    () => null,
  );
};

const handleUpdateProductRuleSize = (
  state: Draft<ProgServState>,
  action: PayloadAction<{ servCodeId: string; ruleId: string; size: number }>,
) => {
  const { servCodeId, ruleId, size } = action.payload;
  executeUpdateProductRule(
    state.servCodeDocs,
    state.unsavedServCodeChanges,
    servCodeId,
    ruleId,
    (rule) => ({ ...rule, size }),
  );
};

const handleUpdateProductRuleOperator = (
  state: Draft<ProgServState>,
  action: PayloadAction<{
    servCodeId: string;
    ruleId: string;
    sizeOperator: ProductRuleDoc["sizeOperator"];
  }>,
) => {
  const { servCodeId, ruleId, sizeOperator } = action.payload;
  executeUpdateProductRule(
    state.servCodeDocs,
    state.unsavedServCodeChanges,
    servCodeId,
    ruleId,
    (rule) => ({ ...rule, sizeOperator }),
  );
};

const handleAddProductRuleProductMaster = (
  state: Draft<ProgServState>,
  action: PayloadAction<{
    servCodeId: string;
    ruleId: string;
    productMasterId: number;
  }>,
) => {
  const { servCodeId, ruleId, productMasterId } = action.payload;
  executeUpdateProductRule(
    state.servCodeDocs,
    state.unsavedServCodeChanges,
    servCodeId,
    ruleId,
    (rule) => ({
      ...rule,
      productMasterIds: [...rule.productMasterIds, productMasterId],
    }),
  );
};

const handleRemoveProductRuleProductMaster = (
  state: Draft<ProgServState>,
  action: PayloadAction<{
    servCodeId: string;
    ruleId: string;
    productMasterId: number;
  }>,
) => {
  const { servCodeId, ruleId, productMasterId } = action.payload;
  executeUpdateProductRule(
    state.servCodeDocs,
    state.unsavedServCodeChanges,
    servCodeId,
    ruleId,
    (rule) => ({
      ...rule,
      productMasterIds: rule.productMasterIds.filter(
        (id) => id !== productMasterId,
      ),
    }),
  );
};

// ─── ProgCode actions ─────────────────────────────────────────────────────────

const handleUpdateProgCode = (
  state: Draft<ProgServState>,
  action: PayloadAction<Partial<ProgCodeDoc>>,
) => {
  const { progCodeId, ...changes } = action.payload;
  if (!progCodeId) return;

  const index = state.progCodeDocs.findIndex(
    (doc) => doc.progCodeId === progCodeId,
  );
  if (index === -1) return;

  let unsavedChanges = state.unsavedProgCodeChanges.find(
    (c) => c.updated.progCodeId === progCodeId,
  );

  if (!unsavedChanges) {
    unsavedChanges = {
      original: { ...state.progCodeDocs[index] },
      updated: { ...state.progCodeDocs[index] },
    };
    state.unsavedProgCodeChanges.push(unsavedChanges);
  }

  unsavedChanges.updated = {
    ...unsavedChanges.updated,
    ...changes,
  };

  state.progCodeDocs[index] = unsavedChanges.updated;
};

const handleRevertProgCode = (
  state: Draft<ProgServState>,
  action: PayloadAction<{ progCodeId: string }>,
) => {
  const { progCodeId } = action.payload;
  const changeIndex = state.unsavedProgCodeChanges.findIndex(
    (c) => c.updated.progCodeId === progCodeId,
  );

  if (changeIndex !== -1) {
    const change = state.unsavedProgCodeChanges[changeIndex];

    const docIndex = state.progCodeDocs.findIndex(
      (d) => d.progCodeId === progCodeId,
    );

    if (docIndex !== -1) {
      state.progCodeDocs[docIndex] = change.original;
    }

    state.unsavedProgCodeChanges.splice(changeIndex, 1);
  }
};

export const progServActionHandlers = {
  updateServCode: handleUpdateServCode,
  revertServCode: handleRevertServCode,
  addProductRule: handleAddProductRule,
  removeProductRule: handleRemoveProductRule,
  updateProductRuleSize: handleUpdateProductRuleSize,
  updateProductRuleOperator: handleUpdateProductRuleOperator,
  addProductRuleProductMaster: handleAddProductRuleProductMaster,
  removeProductRuleProductMaster: handleRemoveProductRuleProductMaster,
  updateProgCode: handleUpdateProgCode,
  revertProgCode: handleRevertProgCode,
};
