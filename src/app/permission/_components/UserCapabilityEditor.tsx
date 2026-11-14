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
import { DeleteUserDialog } from "@/app/permission/_components/DeleteUserDialog";
import { Notice } from "@/app/permission/_components/Notice";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { canAssign, canManageCapabilitiesOf } from "@/permission/logic/assignmentGuards";
import { capabilityLabel, groupCapabilitiesByGroup } from "@/permission/logic/capabilityLabels";
import { isGateOpen } from "@/permission/logic/navGate";
import {
  assignBundle as previewAssignBundle,
  removeBundle as previewRemoveBundle,
} from "@/permission/logic/userCapabilityLogic";
import { Button } from "@/style/components/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/style/components/select";

/** One user's bundles and direct capabilities. Key it by userName so its pickers reset per user. */
export function UserCapabilityEditor({ userName }: { userName: string }) {
  const authUser = useSelector(authSelect.user);
  const mine = useSelector(userCapabilitiesSelect.mine);
  const users = useSelector(userCapabilitiesSelect.users);
  const holdingsByUserName = useSelector(userCapabilitiesSelect.holdingsByUserName);
  const effectiveByUserName = useSelector(userCapabilitiesSelect.effectiveByUserName);
  const assignableByUserName = useSelector(userCapabilitiesSelect.assignableByUserName);
  const redundantDirectByUserName = useSelector(userCapabilitiesSelect.redundantDirectByUserName);
  const bundles = useSelector(capabilityBundleSelect.docs);
  const bundlesByKey = useSelector(capabilityBundleSelect.byBundleKey);
  const { assignBundle, removeBundle, addDirect, removeDirect } = useUserCapabilities();

  const [bundleToAssign, setBundleToAssign] = useState("");
  const [bundleToRemove, setBundleToRemove] = useState<string | null>(null);
  const [capabilityToAdd, setCapabilityToAdd] = useState("");

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
  const assignable = assignableByUserName[userName] ?? [];
  const grantable = actorIsSuperUser ? assignable : assignable.filter((capability) => actorCapabilities.includes(capability));
  const { groups: grantableByGroup } = groupCapabilitiesByGroup({
    capabilities: grantable,
    registry: capabilityRegistry,
  });

  const assignPreview = bundleToAssign
    ? previewAssignBundle({ user: holdings, bundleKey: bundleToAssign, bundles })
    : null;
  const removePreview = bundleToRemove
    ? previewRemoveBundle({ user: holdings, bundleKey: bundleToRemove, bundles, registry: capabilityRegistry })
    : null;

  function handleAssign() {
    assignBundle({ userName, bundleKey: bundleToAssign });
    setBundleToAssign("");
  }

  function handleConfirmRemove(bundleKey: string) {
    removeBundle({ userName, bundleKey });
    setBundleToRemove(null);
  }

  function handleAddDirect() {
    addDirect({ userName, capabilities: [capabilityToAdd] });
    setCapabilityToAdd("");
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">
            {summary.firstName} {summary.lastName}
          </h2>
          <p className="text-sm text-muted-foreground">
            @{summary.userName} · SA ID {summary.saId} · role {summary.role}
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
                      <div className="flex gap-2">
                        <Button size="sm" variant="destructive" onClick={() => handleConfirmRemove(bundleKey)}>
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
        <h3 className="text-sm font-semibold text-foreground">Direct capabilities</h3>
        <CapabilityGroups
          capabilities={holdings.capabilities}
          emptyText="None. Everything this user can do comes from bundles."
          onRemoveAction={
            editable ? (capability) => removeDirect({ userName, capability }) : undefined
          }
        />
        {editable && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Select value={capabilityToAdd} onValueChange={setCapabilityToAdd}>
                <SelectTrigger>
                  <SelectValue placeholder={grantable.length === 0 ? "Nothing left to add" : "Add a capability..."} />
                </SelectTrigger>
                <SelectContent>
                  {grantableByGroup.map((group) => (
                    <SelectGroup key={group.groupKey}>
                      <SelectLabel>{group.groupName}</SelectLabel>
                      {group.capabilities.map((capability) => (
                        <SelectItem key={capability} value={capability}>
                          {capabilityLabel({ capability, registry: capabilityRegistry })}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" disabled={!capabilityToAdd} onClick={handleAddDirect}>
                Add
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Everything this user can do</h3>
        <CapabilityGroups capabilities={effective} emptyText="Nothing. This user can only use public pages." />
      </section>
    </div>
  );
}
