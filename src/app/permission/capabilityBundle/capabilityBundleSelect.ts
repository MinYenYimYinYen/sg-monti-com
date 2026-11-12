import { AppState } from "@/store";
import { createSelector } from "@reduxjs/toolkit";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { bundleRegistryDiff } from "@/permission/logic/capabilitySelectorLogic";

const selectDocs = (state: AppState) => state.capabilityBundle.docs;

const selectByBundleKey = createSelector([selectDocs], (docs) =>
  Object.fromEntries(docs.map((doc) => [doc.bundleKey, doc])),
);

/** Per bundle: what it lacks from the registry, and which of its strings are stale. For the editor. */
const selectRegistryDiffByBundleKey = createSelector([selectDocs], (docs) =>
  Object.fromEntries(docs.map((doc) => [doc.bundleKey, bundleRegistryDiff({ bundle: doc, registry: capabilityRegistry })])),
);

export const capabilityBundleSelect = {
  docs: selectDocs,
  byBundleKey: selectByBundleKey,
  registryDiffByBundleKey: selectRegistryDiffByBundleKey,
};
