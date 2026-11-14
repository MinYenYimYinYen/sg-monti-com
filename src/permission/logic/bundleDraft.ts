import type { Capability } from "@/permission/PermissionTypes";
import type { BundleGrants } from "@/permission/logic/permissionLogicTypes";

// The bundle editor's working copy. Pure so the editing rules can be tested without React.

export type BundleDraft = {
  bundleKey: string;
  name: string;
  description: string;
  capabilities: Capability[];
};

export const EMPTY_BUNDLE_DRAFT: BundleDraft = { bundleKey: "", name: "", description: "", capabilities: [] };

export function draftFromBundle(bundle: BundleGrants & { name: string; description?: string }): BundleDraft {
  return {
    bundleKey: bundle.bundleKey,
    name: bundle.name,
    description: bundle.description ?? "",
    capabilities: [...bundle.capabilities],
  };
}

/** Adds or removes one capability. Order is kept: new ones go on the end. Returns a new draft. */
export function toggleDraftCapability({
  draft,
  capability,
  selected,
}: {
  draft: BundleDraft;
  capability: Capability;
  selected: boolean;
}): BundleDraft {
  const without = draft.capabilities.filter((existing) => existing !== capability);
  return { ...draft, capabilities: selected ? [...without, capability] : without };
}

/** Adds every capability in the list that the draft lacks, or removes them all. */
export function setDraftCapabilities({
  draft,
  capabilities,
  selected,
}: {
  draft: BundleDraft;
  capabilities: readonly Capability[];
  selected: boolean;
}): BundleDraft {
  const listed = new Set<Capability>(capabilities);
  const kept = draft.capabilities.filter((existing) => !listed.has(existing));
  const added = selected ? capabilities.filter((capability) => !draft.capabilities.includes(capability)) : [];
  return { ...draft, capabilities: selected ? [...draft.capabilities, ...added] : kept };
}

/**
 * Applies what a matrix cell changes: removes what it clears, then adds what it grants. Order is
 * kept and new ones go on the end, like the other draft edits.
 */
export function applyCellChange({
  draft,
  change,
}: {
  draft: BundleDraft;
  change: { add: readonly Capability[]; remove: readonly Capability[] };
}): BundleDraft {
  const cleared = new Set<Capability>(change.remove);
  const kept = draft.capabilities.filter((capability) => !cleared.has(capability));
  const added = change.add.filter((capability) => !kept.includes(capability));
  return { ...draft, capabilities: [...kept, ...added] };
}

/** Whether the draft differs from what is stored (a new bundle always counts as changed once it has a key). */
export function isDraftChanged({
  draft,
  stored,
}: {
  draft: BundleDraft;
  stored: (BundleGrants & { name: string; description?: string }) | undefined;
}): boolean {
  if (!stored) return draft.bundleKey.trim() !== "" || draft.name.trim() !== "" || draft.capabilities.length > 0;
  return (
    draft.name !== stored.name ||
    draft.description !== (stored.description ?? "") ||
    draft.capabilities.length !== stored.capabilities.length ||
    draft.capabilities.some((capability, index) => capability !== stored.capabilities[index])
  );
}
