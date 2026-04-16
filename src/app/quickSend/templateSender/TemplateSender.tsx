"use client";

import React from "react";
import { useSenderState } from "./useSenderState";
import { ChoiceSelector } from "./_components/ChoiceSelector";
import { OutputGroup } from "./_components/OutputGroup";
import { TableOutputGroup } from "./_components/TableOutputGroup";
import { Separator } from "@/style/components/separator";
import { CustomerLookup } from "@/app/quickSend/templates/dataFeatures/custIdSearch/CustomerLookup";
import { ProgramSelector } from "@/app/quickSend/templates/dataFeatures/progCode/ProgramSelector";
import type { TreeNodeDoc } from "@/app/quickSend/templates/TemplateTypes";
import type { DataFeatureKey } from "@/app/quickSend/templates/dataFeatures/dataFeatures";

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
 * - Renders ProgramSelector with props when progCode data feature is active.
 * - Renders TableOutputGroup (plain HTML) for table blocks.
 */
export function TemplateSender({ fragment, label }: TemplateSenderProps) {
  const { activeChoices, setChoice, resolvedGroups, hasChoices, selectedProgCodeId, setSelectedProgCodeId } =
    useSenderState(fragment);

  const blocks = fragment?.blocks ?? [];
  const dataFeatures = (fragment?.dataFeatures ?? []) as DataFeatureKey[];
  const hasTableBlock = blocks.some((b) => b.feature === "table");

  console.log("[TemplateSender] fragment:", fragment);

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

      {/* Render UI components for enabled data features */}
      {dataFeatures.includes("custIdSearch") && (
        <>
          <CustomerLookup />
          <Separator />
        </>
      )}
      {(dataFeatures.includes("progCode") || hasTableBlock) && (
        <>
          <ProgramSelector
            selectedProgCodeId={selectedProgCodeId}
            onSelect={setSelectedProgCodeId}
          />
          <Separator />
        </>
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
        {resolvedGroups.map((group) =>
          group.isTable ? (
            <TableOutputGroup
              key={group.groupId}
              html={group.html}
              label={group.label ?? (resolvedGroups.length > 1 ? `Group ${group.groupId}` : undefined)}
            />
          ) : (
            <OutputGroup
              key={group.groupId}
              html={group.html}
              label={group.label ?? (resolvedGroups.length > 1 ? `Group ${group.groupId}` : undefined)}
            />
          )
        )}
      </div>
    </div>
  );
}
