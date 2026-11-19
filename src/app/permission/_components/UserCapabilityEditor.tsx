"use client";

import { useState } from "react";
import { useSelector } from "react-redux";
import { authSelect } from "@/app/auth/authSlice";
import { judgeUserDeletion } from "@/app/auth/_lib/userDeletion";
import { capabilityBundleSelect } from "@/app/permission/capabilityBundle/capabilityBundleSelect";
import { can } from "@/permission/can";
import { userCapabilitiesSelect } from "@/app/permission/userCapabilities/userCapabilitiesSelect";
import { useUserCapabilities } from "@/app/permission/userCapabilities/useUserCapabilities";
import { CapabilityGroups } from "@/app/permission/_components/CapabilityGroups";
import { CapabilityMatrix, type ToggleCellParams } from "@/app/permission/_components/CapabilityMatrix";
import { DeleteUserDialog } from "@/app/permission/_components/DeleteUserDialog";
import { Notice } from "@/app/permission/_components/Notice";
import { registryMatrix } from "@/app/permission/_lib/registryMatrix";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { canAssign, canManageCapabilitiesOf, canRemove } from "@/permission/logic/assignmentGuards";
import { capabilityLabel } from "@/permission/logic/capabilityLabels";
import { cellKey, planUserMatrix } from "@/permission/logic/capabilityMatrix";
import { isGateOpen } from "@/permission/logic/navGate";
import {
  assignBundle as previewAssignBundle,
  bundleCapabilitiesHeld,
  removeBundle as previewRemoveBundle,
} from "@/permission/logic/userCapabilityLogic";
import { Button } from "@/style/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/style/components/select";

/** One user's bundles and direct capabilities. Key it by userName so its pickers reset per user. */
export function UserCapabilityEditor({ userName }: { userName: string }) {
  const authUser = useSelector(authSelect.user);
  const mine = useSelector(userCapabilitiesSelect.mine);
  const users = useSelector(userCapabilitiesSelect.users);
  const holdingsByUserName = useSelector(userCapabilitiesSelect.holdingsByUserName);
  const effectiveByUserName = useSelector(userCapabilitiesSelect.effectiveByUserName);
  const redundantDirectByUserName = useSelector(userCapabilitiesSelect.redundantDirectByUserName);
  const bundles = useSelector(capabilityBundleSelect.docs);
  const bundlesByKey = useSelector(capabilityBundleSelect.byBundleKey);
  const { assignBundle, removeBundle, addDirect, removeDirect } = useUserCapabilities();

  const [bundleToAssign, setBundleToAssign] = useState("");
  const [bundleToRemove, setBundleToRemove] = useState<string | null>(null);

  const summary = users.find((candidate) => candidate.userName === userName);
  const holdings = holdingsByUserName[userName];
  if (!summary || !holdings) return null;

  const actorIsSuperUser = !!mine?.isSuperUser;
  const actorCapabilities = mine?.capabilities ?? [];
  const canManageTarget = canManageCapabilitiesOf({ target: summary, actorIsSuperUser });
  const canWrite = isGateOpen({ gate: { capability: can.userCapabilities.write }, user: authUser, mine });
  const editable = canManageTarget && canWrite;
  // The same rule the server enforces (not yourself, not a superuser), so the button is only
  // offered when the delete could go through.
  const canDelete =
    actorIsSuperUser && !!authUser && judgeUserDeletion({ actorUserName: authUser.userName, target: summary }).ok;

  const effective = effectiveByUserName[userName] ?? [];
  const redundant = redundantDirectByUserName[userName] ?? [];

  // Mirrors the server's no-escalation rule so the pickers only offer what the caller may hand out.
  const bundleOptions = bundles
    .filter((bundle) => !holdings.bundleKeys.includes(bundle.bundleKey))
    .map((bundle) => ({
      bundle,
      allowed: canAssign({ actorIsSuperUser, actorCapabilities, granting: bundle.capabilities }).allowed,
    }));

  // The matrix cannot clear these: a stale string has no checkbox, and a direct grant a bundle
  // already lists is locked by the bundle. They get their own short list so they can be removed.
  const directToCleanUp = [
    ...new Set([...holdings.capabilities.filter((capability) => !capabilityRegistry.has(capability)), ...redundant]),
  ];

  // Mirrors the server's rule that a non-superuser can only remove what they hold themselves.
  const removableCleanUp = new Set(
    directToCleanUp.filter(
      (capability) =>
        canRemove({ actorIsSuperUser, actorCapabilities, removing: [capability], registry: capabilityRegistry })
          .allowed,
    ),
  );

  // A direct grant cannot repeat what a held bundle lists, so those cells are locked.
  const userMatrixPlan = planUserMatrix({
    matrix: registryMatrix,
    effective: new Set(effective),
    viaBundle: bundleCapabilitiesHeld({ bundleKeys: holdings.bundleKeys, bundles }),
    actorIsSuperUser,
    actorCapabilities,
    registry: capabilityRegistry,
  });

  const assignPreview = bundleToAssign
    ? previewAssignBundle({ user: holdings, bundleKey: bundleToAssign, bundles })
    : null;
  const removePreview = bundleToRemove
    ? previewRemoveBundle({ user: holdings, bundleKey: bundleToRemove, bundles, registry: capabilityRegistry })
    : null;

  // Mirrors the server's no-escalation rule for taking access away: only what the actor holds.
  const removeGuard = removePreview?.ok
    ? canRemove({
        actorIsSuperUser,
        actorCapabilities,
        removing: removePreview.lost,
        registry: capabilityRegistry,
      })
    : null;

  function handleAssign() {
    assignBundle({ userName, bundleKey: bundleToAssign });
    setBundleToAssign("");
  }

  function handleConfirmRemove(bundleKey: string) {
    removeBundle({ userName, bundleKey });
    setBundleToRemove(null);
  }

  // One click is one write: the plan holds either the capabilities to add or the ones to remove.
  function handleToggleCell({ rowKey, cell }: ToggleCellParams) {
    const plan = userMatrixPlan.plans[cellKey({ rowKey, verb: cell.verb })];
    if (!plan?.enabled) return;
    if (plan.change.add.length > 0) addDirect({ userName, capabilities: plan.change.add });
    if (plan.change.remove.length > 0) removeDirect({ userName, capabilities: plan.change.remove });
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            {summary.firstName} {summary.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            @{summary.userName} · SA ID {summary.saId}
          </p>
        </div>
        {canDelete && <DeleteUserDialog userName={summary.userName} />}
      </header>

      {!canManageTarget && (
        <Notice>Only a superuser can change the capabilities of a kiosk or superuser.</Notice>
      )}
      {canManageTarget && !canWrite && <Notice>You can view assignments but not change them.</Notice>}
      {summary.isSuperUser && (
        <Notice>A superuser passes every capability check, so the lists below do not limit this user.</Notice>
      )}
      {redundant.length > 0 && (
        <Notice tone="warning">
          This user holds {redundant.length} direct grant(s) that a bundle already lists. Removing the bundle would
          not remove that access. Remove the direct grant, or save the bundle again to repair it.
        </Notice>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Bundles</h3>
        {holdings.bundleKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bundles.</p>
        ) : (
          <ul className="space-y-2">
            {holdings.bundleKeys.map((bundleKey) => {
              const bundle = bundlesByKey[bundleKey];
              return (
                <li key={bundleKey} className="space-y-2 rounded-md border border-border bg-card p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-foreground">{bundle?.name ?? bundleKey}</p>
                      <p className="text-xs text-muted-foreground">
                        {bundle ? `${bundle.capabilities.length} capabilities` : "This bundle no longer exists"}
                      </p>
                    </div>
                    {editable && bundleToRemove !== bundleKey && (
                      <Button size="sm" variant="outline" onClick={() => setBundleToRemove(bundleKey)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  {bundleToRemove === bundleKey && removePreview?.ok && (
                    <div className="space-y-2 rounded-md border border-border bg-accent/10 p-3">
                      <p className="text-sm text-foreground">
                        Removing this bundle takes away {removePreview.lost.length} capabilit
                        {removePreview.lost.length === 1 ? "y" : "ies"}:
                      </p>
                      <CapabilityGroups
                        capabilities={removePreview.lost}
                        emptyText="Nothing: the user still holds all of it another way."
                      />
                      {removeGuard && !removeGuard.allowed && (
                        <Notice tone="warning">
                          You can only remove capabilities you hold yourself. You do not hold:
                          <ul className="mt-1 list-disc pl-5">
                            {removeGuard.missing.map((capability) => (
                              <li key={capability}>{capabilityLabel({ capability, registry: capabilityRegistry })}</li>
                            ))}
                          </ul>
                        </Notice>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!!removeGuard && !removeGuard.allowed}
                          onClick={() => handleConfirmRemove(bundleKey)}
                        >
                          Remove bundle
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setBundleToRemove(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {editable &&
          (bundleOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Every bundle is already assigned.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Select value={bundleToAssign} onValueChange={setBundleToAssign}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add a bundle..." />
                  </SelectTrigger>
                  <SelectContent>
                    {bundleOptions.map(({ bundle, allowed }) => (
                      <SelectItem key={bundle.bundleKey} value={bundle.bundleKey} disabled={!allowed}>
                        {bundle.name}
                        {!allowed && " (includes capabilities you do not hold)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" disabled={!assignPreview?.ok} onClick={handleAssign}>
                  Assign
                </Button>
              </div>
              {assignPreview?.ok && assignPreview.removedDirect.length > 0 && (
                <Notice>
                  This bundle already lists {assignPreview.removedDirect.length} direct grant(s) this user holds, so
                  assigning it removes them:
                  <ul className="mt-1 list-disc pl-5">
                    {assignPreview.removedDirect.map((capability) => (
                      <li key={capability}>{capabilityLabel({ capability, registry: capabilityRegistry })}</li>
                    ))}
                  </ul>
                </Notice>
              )}
            </div>
          ))}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Capabilities</h3>
        <p className="text-xs text-muted-foreground">
          Everything this user holds, through bundles or directly. A checkbox you click adds or removes direct grants
          only: what a bundle grants stays until the bundle is removed.
        </p>
        <CapabilityMatrix
          matrix={registryMatrix}
          held={new Set(effective)}
          disabled={!editable}
          disabledCells={userMatrixPlan.disabledCells}
          cellNotes={userMatrixPlan.cellNotes}
          onToggleCellAction={handleToggleCell}
        />
      </section>

      {directToCleanUp.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Direct grants to clean up</h3>
          <p className="text-xs text-muted-foreground">
            These do not appear as their own checkbox: a bundle already lists them, or the capability no longer
            exists.
          </p>
          <CapabilityGroups
            capabilities={directToCleanUp}
            emptyText=""
            removable={removableCleanUp}
            onRemoveAction={
              editable ? (capability) => removeDirect({ userName, capabilities: [capability] }) : undefined
            }
          />
        </section>
      )}
    </div>
  );
}
