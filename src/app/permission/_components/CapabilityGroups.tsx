"use client";

import { X } from "lucide-react";
import { Button } from "@/style/components/button";
import { capabilityRegistry } from "@/permission/capabilityRegistry";
import { capabilityLabel, groupCapabilitiesByFeature } from "@/permission/logic/capabilityLabels";
import type { Capability } from "@/permission/PermissionTypes";

type CapabilityGroupsProps = {
  capabilities: readonly Capability[];
  emptyText: string;
  /** When given, each capability shows a remove button. A generic primitive, so it keeps a callback. */
  onRemoveAction?: (capability: Capability) => void;
};

/** Capabilities grouped by the feature that declares them. Stale strings are shown, not hidden. */
export function CapabilityGroups({ capabilities, emptyText, onRemoveAction }: CapabilityGroupsProps) {
  if (capabilities.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>;
  }

  const { features, unknown } = groupCapabilitiesByFeature({ capabilities, registry: capabilityRegistry });

  return (
    <div className="space-y-3">
      {features.map((feature) => (
        <div key={feature.featureKey}>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{feature.featureKey}</h4>
          <ul className="mt-1 space-y-1">
            {feature.capabilities.map((capability) => (
              <CapabilityRow key={capability} capability={capability} onRemoveAction={onRemoveAction} />
            ))}
          </ul>
        </div>
      ))}
      {unknown.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wide text-destructive">No longer exists</h4>
          <ul className="mt-1 space-y-1">
            {unknown.map((capability) => (
              <CapabilityRow key={capability} capability={capability} onRemoveAction={onRemoveAction} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CapabilityRow({
  capability,
  onRemoveAction,
}: {
  capability: Capability;
  onRemoveAction?: (capability: Capability) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1 text-sm">
      <span className="text-foreground" title={capability}>
        {capabilityLabel({ capability, registry: capabilityRegistry })}
      </span>
      {onRemoveAction && (
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-6 w-6"
          aria-label={`Remove ${capability}`}
          onClick={() => onRemoveAction(capability)}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </li>
  );
}
