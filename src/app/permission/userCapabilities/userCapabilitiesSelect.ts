import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { capabilityBundleSelect } from "@/app/permission/capabilityBundle/capabilityBundleSelect";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { findMissingRequirements } from "@/permission/logic/requirementLogic";
import type { UserGrants } from "@/permission/logic/permissionLogicTypes";
import {
  assignableCapabilities,
  holdersByBundleKey,
  redundantDirect,
} from "@/permission/logic/capabilitySelectorLogic";
import { resolveEffective } from "@/permission/logic/resolveEffective";
import { sortUserSummaries } from "@/permission/logic/userSummary";
import { authSelect } from "@/app/auth/authSlice";
import { CapabilityRequirement } from "@/permission/PermissionTypes";
import { isGateOpen } from "@/permission/logic/navGate";

// Parameterized selectors would need factories, so each of these returns a map keyed by
// userName. A component reads `useSelector(userCapabilitiesSelect.effectiveByUserName)[userName]`.

const selectRawUsers = (state: AppState) => state.userCapabilities.users;
const selectDocs = (state: AppState) => state.userCapabilities.docs;
const selectMine = (state: AppState) => state.userCapabilities.mine;

const selectAllows = createSelector(
  [authSelect.user, selectMine],
  (user, mine) => {
    return (required: CapabilityRequirement) =>
      isGateOpen({
        gate: { capability: required },
        user,
        mine,
      });
  },
);

const selectUsers = createSelector([selectRawUsers], (users) =>
  sortUserSummaries(users),
);

const selectByUserName = createSelector([selectDocs], (docs) =>
  Object.fromEntries(docs.map((doc) => [doc.userName, doc])),
);

/**
 * What every user holds, including users who have no document yet (an applied user holds
 * nothing). Everything below derives from this, so a user with no document still gets an entry.
 */
const selectHoldingsByUserName = createSelector(
  [selectUsers, selectDocs],
  (users, docs) => {
    const holdings: Record<string, UserGrants> = {};
    for (const user of users)
      holdings[user.userName] = {
        userName: user.userName,
        bundleKeys: [],
        capabilities: [],
      };
    for (const doc of docs) holdings[doc.userName] = doc;
    return holdings;
  },
);

const selectHoldings = createSelector(
  [selectHoldingsByUserName],
  (holdingsByUserName) => Object.values(holdingsByUserName),
);

/** Each user's bundles plus direct grants, resolved to one flat list. */
const selectEffectiveByUserName = createSelector(
  [selectHoldings, capabilityBundleSelect.docs],
  (holdings, bundles) =>
    Object.fromEntries(
      holdings.map((user) => [
        user.userName,
        resolveEffective({
          bundleKeys: user.bundleKeys,
          directCapabilities: user.capabilities,
          bundles,
          registry: capabilityRegistry,
        }),
      ]),
    ),
);

/** What could still be added to each user: the registry minus what they already have. */
const selectAssignableByUserName = createSelector(
  [selectHoldings, capabilityBundleSelect.docs],
  (holdings, bundles) =>
    Object.fromEntries(
      holdings.map((user) => [
        user.userName,
        assignableCapabilities({ user, bundles, registry: capabilityRegistry }),
      ]),
    ),
);

/** Direct grants a held bundle already lists. Should be empty; anything here is drift to repair. */
const selectRedundantDirectByUserName = createSelector(
  [selectHoldings, capabilityBundleSelect.docs],
  (holdings, bundles) =>
    Object.fromEntries(
      holdings.map((user) => [
        user.userName,
        redundantDirect({ user, bundles }),
      ]),
    ),
);

/** Warn-only hints (a capability held without something it needs). Nothing blocks and nothing is added. */
const selectMissingRequirementsByUserName = createSelector(
  [selectEffectiveByUserName],
  (effectiveByUserName) =>
    Object.fromEntries(
      Object.entries(effectiveByUserName).map(([userName, capabilities]) => [
        userName,
        findMissingRequirements({ capabilities, registry: capabilityRegistry }),
      ]),
    ),
);

/** Who holds each bundle. A bundle with holders cannot be deleted. */
const selectHoldersByBundleKey = createSelector([selectDocs], (docs) =>
  holdersByBundleKey({ users: docs }),
);

export const userCapabilitiesSelect = {
  users: selectUsers,
  docs: selectDocs,
  mine: selectMine,
  allows: selectAllows,
  byUserName: selectByUserName,
  holdingsByUserName: selectHoldingsByUserName,
  holdings: selectHoldings,
  effectiveByUserName: selectEffectiveByUserName,
  assignableByUserName: selectAssignableByUserName,
  redundantDirectByUserName: selectRedundantDirectByUserName,
  missingRequirementsByUserName: selectMissingRequirementsByUserName,
  holdersByBundleKey: selectHoldersByBundleKey,
};
