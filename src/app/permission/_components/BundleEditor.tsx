"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { CapabilityMatrix } from "@/app/permission/_components/CapabilityMatrix";
import { Notice } from "@/app/permission/_components/Notice";
import { registryMatrix } from "@/app/permission/_lib/registryMatrix";
import { capabilityBundleSelect } from "@/app/permission/capabilityBundle/capabilityBundleSelect";
import { useCapabilityBundle } from "@/app/permission/capabilityBundle/useCapabilityBundle";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { FormGroup } from "@/components/FormGroup";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { saveBundle } from "@/permission/logic/bundleLogic";
import {
  applyCellChange,
  BundleDraft,
  draftFromBundle,
  EMPTY_BUNDLE_DRAFT,
  isDraftChanged,
  toggleDraftCapability,
} from "@/permission/logic/bundleDraft";
import { cellChange } from "@/permission/logic/capabilityMatrix";
import { bundleRegistryDiff } from "@/permission/logic/capabilitySelectorLogic";
import { Button } from "@/style/components/button";
import { Input } from "@/style/components/input";
import { Label } from "@/style/components/label";

type BundleEditorProps = {
  /** The stored bundle's key, or "" to start a new one. */
  bundleKey: string;
  onDoneAction: () => void;
};

/** Edits one bundle. Key it by bundleKey so the draft resets when another bundle is selected. */
export function BundleEditor({ bundleKey, onDoneAction }: BundleEditorProps) {
  const bundlesByKey = useSelector(capabilityBundleSelect.byBundleKey);
  const bundles = useSelector(capabilityBundleSelect.docs);
  const holdings = useSelector(userCapabilitiesSelect.holdings);
  const holdersByBundleKey = useSelector(userCapabilitiesSelect.holdersByBundleKey);
  const { upsertBundle, removeBundle } = useCapabilityBundle();

  const stored = bundleKey ? bundlesByKey[bundleKey] : undefined;
  const isNew = bundleKey === "";
  const [draft, setDraft] = useState<BundleDraft>(() => (stored ? draftFromBundle(stored) : EMPTY_BUNDLE_DRAFT));
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!isNew && !stored) return <Notice tone="warning">That bundle no longer exists.</Notice>;

  // The same function the server runs, so this preview matches what a save will do.
  const result = saveBundle({
    bundleKey: draft.bundleKey,
    capabilities: draft.capabilities,
    existingBundles: bundles,
    users: holdings,
    registry: capabilityRegistry,
  });
  const changed = isDraftChanged({ draft, stored });
  const keyTaken = isNew && !!bundlesByKey[draft.bundleKey];
  const holders = holdersByBundleKey[bundleKey] ?? [];
  const diff = stored ? bundleRegistryDiff({ bundle: stored, registry: capabilityRegistry }) : null;

  const canSave = result.ok && draft.name.trim() !== "" && changed && !keyTaken;

  function handleSave() {
    upsertBundle({
      bundleKey: draft.bundleKey,
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      capabilities: draft.capabilities,
    });
    if (isNew) onDoneAction();
  }

  function handleDelete() {
    removeBundle({ bundleKey });
    onDoneAction();
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <h2 className="text-xl font-semibold text-foreground">{isNew ? "New bundle" : stored?.name}</h2>

      <div className="grid grid-cols-2 gap-4">
        <FormGroup>
          <Label htmlFor="bundle-key">Key</Label>
          <Input
            id="bundle-key"
            value={draft.bundleKey}
            disabled={!isNew}
            onChange={(event) => setDraft((previous) => ({ ...previous, bundleKey: event.target.value }))}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            {isNew
              ? "Letters, digits, _ or -, starting with a letter. It cannot be changed later."
              : "The key cannot be changed."}
          </p>
        </FormGroup>
        <FormGroup>
          <Label htmlFor="bundle-name">Name</Label>
          <Input
            id="bundle-name"
            value={draft.name}
            onChange={(event) => setDraft((previous) => ({ ...previous, name: event.target.value }))}
          />
        </FormGroup>
      </div>
      <FormGroup>
        <Label htmlFor="bundle-description">Description</Label>
        <Input
          id="bundle-description"
          value={draft.description}
          onChange={(event) => setDraft((previous) => ({ ...previous, description: event.target.value }))}
        />
      </FormGroup>

      {keyTaken && <Notice tone="warning">A bundle with that key already exists.</Notice>}
      {!isNew && diff && diff.stale.length > 0 && (
        <Notice tone="warning">
          This bundle lists {diff.stale.length} capabilit{diff.stale.length === 1 ? "y" : "ies"} that no longer
          exist. They grant nothing. Remove them here and save:
          <ul className="mt-1 space-y-1">
            {diff.stale
              .filter((capability) => draft.capabilities.includes(capability))
              .map((capability) => (
                <li key={capability} className="flex items-center gap-2">
                  <span>{capability}</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDraft((previous) => toggleDraftCapability({ draft: previous, capability, selected: false }))
                    }
                  >
                    Remove
                  </Button>
                </li>
              ))}
          </ul>
        </Notice>
      )}
      {draft.bundleKey !== "" && !result.ok && result.reason === "invalidKey" && (
        <Notice tone="warning">The key must start with a letter and use only letters, digits, _ or -.</Notice>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Capabilities</h3>
        <CapabilityMatrix
          matrix={registryMatrix}
          held={new Set(draft.capabilities)}
          onToggleCellAction={({ cell, turnOn }) =>
            setDraft((previous) =>
              applyCellChange({
                draft: previous,
                change: cellChange({
                  cell,
                  held: new Set(previous.capabilities),
                  turnOn,
                  registry: capabilityRegistry,
                }),
              }),
            )
          }
        />
      </section>

      {result.ok && !isNew && changed && (
        <Notice>
          Saving this bundle changes access for {result.holders.length} user(s).
          {result.added.length > 0 && <> Adds {result.added.length}.</>}
          {result.removed.length > 0 && <> Removes {result.removed.length}.</>}
          {result.stripDirect.length > 0 && (
            <>
              {" "}
              It also removes direct grants the bundle now lists from:{" "}
              {result.stripDirect.map((strip) => `${strip.userName} (${strip.capabilities.length})`).join(", ")}.
            </>
          )}
        </Notice>
      )}

      <div className="flex items-center gap-2">
        <Button disabled={!canSave} onClick={handleSave}>
          Save
        </Button>
        <Button variant="outline" onClick={onDoneAction}>
          {changed ? "Discard" : "Close"}
        </Button>
        {!isNew &&
          (holders.length > 0 ? (
            <span className="ml-auto text-xs text-muted-foreground">
              Held by {holders.length} user(s), so it cannot be deleted.
            </span>
          ) : confirmingDelete ? (
            <span className="ml-auto flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                Delete bundle
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmingDelete(false)}>
                Keep
              </Button>
            </span>
          ) : (
            <Button variant="outline" size="sm" className="ml-auto" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          ))}
      </div>
    </div>
  );
}
