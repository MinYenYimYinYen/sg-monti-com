"use client";

import React from "react";
import { useSenderState } from "./useSenderState";
import { ChoiceSelector } from "./_components/ChoiceSelector";
import { OutputGroup } from "./_components/OutputGroup";
import { Separator } from "@/style/components/separator";
import type { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";

interface TemplateSenderProps {
  fragment: TreeNodeDoc["fragment"] | undefined;
  /** Display name of the fragment (shown as a heading). */
  label?: string;
}

/**
 * Send-time view for a single fragment.
 * - Shows choice selectors if the fragment has any choice groups.
 * - Renders one copyable output group per groupId.
 * - Resolves {{customer.*}} variables against the currently loaded customer.
 */
export function TemplateSender({ fragment, label }: TemplateSenderProps) {
  const { activeChoices, setChoice, resolvedGroups, hasChoices } =
    useSenderState(fragment);

  const blocks = fragment?.blocks ?? [];

  if (blocks.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        {fragment
          ? "This template has no content blocks."
          : "Select a template to get started."}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      {label && (
        <h2 className="text-base font-semibold text-foreground">{label}</h2>
      )}

      {hasChoices && (
        <>
          <ChoiceSelector
            blocks={blocks}
            activeChoices={activeChoices}
            setChoice={setChoice}
          />
          <Separator />
        </>
      )}

      <div className="flex flex-col gap-4">
        {resolvedGroups.map((group) => (
          <OutputGroup
            key={group.groupId}
            html={group.html}
            label={group.label ?? (resolvedGroups.length > 1 ? `Group ${group.groupId}` : undefined)}
          />
        ))}
      </div>
    </div>
  );
}
